from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import pandas as pd
import os
import math
import sorting
from sorting import main as sort_restaurants

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

_original_data = None

def load_original_data():
    global _original_data
    if _original_data is None:
        json_path = 'restaurants.json'
        if os.path.exists(json_path):
            with open(json_path, 'r') as f:
                _original_data = json.load(f)
        else:
            _original_data = []
    return _original_data

def load_restaurants_data():
    csv_path = 'YELP.Restaurants.csv'
    
    # Always use CSV if it exists (primary data source)
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        # Convert to dict records, ensuring we have the columns we need
        records = df.to_dict('records')
        return records
    else:
        # Fallback to JSON if CSV doesn't exist
        original_data = load_original_data()
        records = []
        for item in original_data:
            records.append({
                'restaurant_name': item.get('name', ''),
                'restaurant_address': item.get('address', ''),
                'restaurant_tag': ', '.join(item.get('tags', [])),
                'rating': item.get('rating', None),
                'price': item.get('price', None)
            })
        return records

def convert_to_frontend_format(restaurants, user_lat=None, user_lon=None, dists=None):
    result = []
    
    # Try to load coordinates from coordinates.csv file
    coord_map = {}
    coord_csv_path = 'distances/coordinates.csv'
    if os.path.exists(coord_csv_path):
        try:
            coord_df = pd.read_csv(coord_csv_path, index_col=0)
            for address, row in coord_df.iterrows():
                # Coordinates are stored as "lat lon" string in radians
                coord_str = str(row.iloc[0])
                if coord_str and coord_str.lower() != 'nan':
                    parts = coord_str.split()
                    if len(parts) >= 2:
                        try:
                            # Convert from radians back to degrees for display
                            lat_rad = float(parts[0])
                            lon_rad = float(parts[1])
                            coord_map[str(address)] = {
                                'lat': math.degrees(lat_rad),
                                'lon': math.degrees(lon_rad)
                            }
                        except (ValueError, IndexError):
                            pass
        except Exception as e:
            app.logger.warning(f"Error loading coordinates.csv: {str(e)}")
    
    # Fallback to restaurants.json if coordinates.csv doesn't have the data
    if not coord_map:
        original_data = load_original_data()
        for item in original_data:
            key = item.get('address', '')
            coord_map[key] = {
                'lat': item.get('lat'),
                'lon': item.get('lon')
            }
    
    for r in restaurants:
        address = r.get('restaurant_address', '')
        
        # Get coordinates from coord_map
        coords = coord_map.get(address, {})
        lat = coords.get('lat')
        lon = coords.get('lon')
        
        # Use review_number from CSV, fallback to 0
        review_count = r.get('review_number', 0)
        if pd.isna(review_count):
            review_count = 0
        else:
            review_count = int(review_count)
        
        tags = []
        if r.get('restaurant_tag'):
            # Handle NaN values
            tag_str = str(r.get('restaurant_tag', ''))
            if tag_str and tag_str.lower() != 'nan':
                tags = [tag.strip() for tag in tag_str.split(',') if tag.strip()]
        
        # Clean up price - remove trailing spaces, handle NaN
        price = r.get('price')
        if pd.isna(price) or (isinstance(price, str) and price.strip() == ''):
            price = None
        elif isinstance(price, str):
            price = price.strip()
        
        # Handle rating NaN
        rating = r.get('rating')
        if pd.isna(rating):
            rating = None
        
        distance_km = None
        if dists and address in dists:
            distance_km = round(dists[address], 2)
        
        result.append({
            'name': r.get('restaurant_name', ''),
            'address': address,
            'lat': lat,
            'lon': lon,
            'tags': tags,
            'rating': rating,
            'price': price,
            'review_count': review_count,
            'distance_km': distance_km
        })
    
    return result

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/restaurants', methods=['GET'])
def get_restaurants():
    try:
        tag = request.args.get('tag', None)
        sort_method = request.args.get('sort_method', 'location')
        ascending_param = request.args.get('ascending', '0')
        ascending = ascending_param == '1' or ascending_param.lower() == 'true'
        lat = request.args.get('lat', None)
        lon = request.args.get('lon', None)
        
        user_address = "100 Morrissey Blvd, Boston, MA 02125"
        if lat and lon:
            user_address = f"{lat}, {lon}"
        
        data_list = load_restaurants_data()
        
        sorted_data, dists = sort_restaurants(
            tag=tag,
            sort_method=sort_method,
            ascending=ascending,
            data_list=data_list,
            user_address=user_address
        )
        
        result = convert_to_frontend_format(sorted_data, lat, lon, dists)
        
        return jsonify(result)
    
    except Exception as e:
        app.logger.error(f"Error processing request: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)

