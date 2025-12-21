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
    json_path = 'restaurants.json'
    csv_path = 'YELP.Restaurants.csv'
    
    original_data = load_original_data()
    
    if not os.path.exists(csv_path) and os.path.exists(json_path):
        records = []
        for item in original_data:
            records.append({
                'restaurant_name': item.get('name', ''),
                'restaurant_address': item.get('address', ''),
                'restaurant_tag': ', '.join(item.get('tags', [])),
                'rating': item.get('rating', None),
                'price': item.get('price', None)
            })
        
        df = pd.DataFrame(records)
        df.to_csv(csv_path, index=False)
        return records
    elif os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        return df.to_dict('records')
    else:
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

def convert_to_frontend_format(restaurants, user_lat=None, user_lon=None):
    result = []
    original_data = load_original_data()
    
    coord_map = {}
    for item in original_data:
        key = item.get('address', '')
        coord_map[key] = {
            'lat': item.get('lat'),
            'lon': item.get('lon'),
            'review_count': item.get('review_count', 0)
        }
    
    for r in restaurants:
        address = r.get('restaurant_address', '')
        
        coords = coord_map.get(address, {})
        lat = coords.get('lat')
        lon = coords.get('lon')
        review_count = coords.get('review_count', 0)
        
        tags = []
        if r.get('restaurant_tag'):
            tags = [tag.strip() for tag in str(r.get('restaurant_tag', '')).split(',')]
        
        distance_km = None
        if address in sorting.dists:
            distance_km = round(sorting.dists[address], 2)
        
        result.append({
            'name': r.get('restaurant_name', ''),
            'address': address,
            'lat': lat,
            'lon': lon,
            'tags': tags,
            'rating': r.get('rating'),
            'price': r.get('price'),
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
        
        sorted_data = sort_restaurants(
            tag=tag,
            sort_method=sort_method,
            ascending=ascending,
            data_list=data_list,
            user_address=user_address
        )
        
        result = convert_to_frontend_format(sorted_data, lat, lon)
        
        return jsonify(result)
    
    except Exception as e:
        app.logger.error(f"Error processing request: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)

