import pandas as pd
from typing import Any, Hashable
import requests
import math

def main(tag=None, sort_method="location", ascending=None, data_list=None) -> list[dict[Hashable, Any]]: #defaults to sorting by location, ascending for all restaurants

    if data_list is None:
        # Load data to dictionary if not passed in
        df = pd.read_csv("YELP.Restaurants.csv", usecols=["restaurant_name", "restaurant_address", "restaurant_tag", "rating", "price"]) #reads the listed columns and puts them into a dict
        data_list = df.to_dict("records")
    # Address data: user address and distances of restaurants to user
    dists = dict()
    user_address = "100 Morrissey Blvd,Boston, MA 02125,"

    if tag is not None: #sort by tag based on what is passed in
        tag = str(tag).lower() #makes sure the tag is lowercase
        data_list = sortTags(data_list, tag)

    sort_method = str(sort_method).lower() #makes sure the sort method is a lowercase string
    if sort_method == "location": #use sort method based on what is passed in
        data_list = sortLocation(data_list, dists, user_address, ascending)
    elif sort_method == "price":
        data_list = sortPrice(data_list, ascending)
    elif sort_method == "rating":
        data_list = sortRating(data_list, ascending)
    else: 
        print("sorting option not recognized")

    return data_list
'''
    for item in data_list: #prints sorted list
        print(*item.values())


    count = 0
    for item in data_list: #printing SOME, but not all elements from across the list
        count += 1
        if count % 5 == 0: 
            print(*item.values())

    

the counter is here so that in testing, you can see values from across the list, 
and not just the end of it that the IDE doesn't cut off. uncomment it and adjust the modulo value (5 right now) to change how many restaurants get printed
'''
    
        

#returns a list containing only restaurants with the sorted tag
def sortTags(data_list: list[dict[Hashable, Any]], tag: str) -> list[dict[Hashable, Any]]: 
    to_ret = []

    for restaurant in data_list[1:]: #puts every restaurant with the listed tag into the list, without case sensitivity
        if not (pd.isna(restaurant["restaurant_tag"])) and (tag in restaurant["restaurant_tag"].lower()):
            to_ret.append(restaurant)

    return to_ret

# Returns list of restaurants sorted by their distance to the user's address; defaults to ascending order
def sortLocation(data_list: list[dict[Hashable, Any]], dists, user_address, ascending=True) -> list[dict[Hashable, Any]]:
    to_ret = []
    # radix sort by distance, up to 3rd significant digit
    locations = [[], [], [], [], [], [], [], [], [], []]

    # counting sort by first decimal place
    for restaurant in data_list[1:]:
        if restaurant["restaurant_address"] not in dists.keys():
            addDistance(user_address, restaurant, dists)
        locations[int(str(dists[restaurant["restaurant_address"]]).split(".")[1][0])].append(restaurant)

    for digit in locations:
        while len(digit) != 0:
            to_ret.append(digit[0])
            digit.pop(0)

    # counting sort by least significant digit
    for restaurant in to_ret:
        locations[int(str(dists[restaurant["restaurant_address"]]).split(".")[0][-1])].append(restaurant)
    to_ret = []

    for digit in locations:
        while len(digit) != 0:
            to_ret.append(digit[0])
            digit.pop(0)

    # counting sort by 2nd least significant digit
    for restaurant in to_ret:
        if dists[restaurant["restaurant_address"]] >= 10.0:
            locations[int(str(dists[restaurant["restaurant_address"]]).split(".")[0][-2])].append(restaurant)
        else:
            locations[0].append(restaurant)
    to_ret = []

    for digit in locations:
        while len(digit) != 0:
            to_ret.append(digit[0])
            digit.pop(0)

    # counting sort by 3rd least significant digit
    for restaurant in to_ret:
        if dists[restaurant["restaurant_address"]] >= 100.0:
            locations[int(str(dists[restaurant["restaurant_address"]]).split(".")[0][-3])].append(restaurant)
        else:
            locations[0].append(restaurant)
    to_ret = []

    # sort by ascending distance
    if ascending:
        for digit in locations:
            for restaurant in digit:
                to_ret.append(restaurant)
    # sort by descending distance
    else:
        for digit in locations[::-1]:
            for restaurant in digit:
                to_ret.append(restaurant)

    return to_ret


# lat/longitude code
'''
def addCoords(address, coords):
    response = requests.get('https://maps.googleapis.com/maps/api/geocode/json', {
        'address': address,
        'key': "AIzaSyCRoYlklKKJ7ZKSwRqeW68UaailZGmf8es"
    })
    if response.status_code == 200:
        if response.json().get('results') and rs.get('status') == 'OK':
            lat = response.json()['results'][0]['geometry']['location']['lat']
            lon = response.json()['results'][0]['geometry']['location']['lng']
            coords[f"{address}"] = [lat, lon]
        else:
            print("api request failed")
    else:
        print("api request failed")
        lat = 0
        lon = 0
'''

#Returns list sorted by price, either ascending or descending depending on what was chosesn. N/A values always come last in the list. ascending by default
def sortPrice(data_list: list[dict[Hashable, Any]], ascending=True) -> list[dict[Hashable, Any]]: 
    to_ret = []
    prices = [[], [], [], [], []] #index 1-4 hold 1-4 dollar sign values, index 0 holds N/A values

    for restaurant in data_list[1:]: #reads every line except the first and puts each one into the prices list for counting sort
        if pd.isna(restaurant["price"]): #N/A value
            prices[0].append(restaurant)
        else: #Non N/A value
            prices[restaurant["price"].count("$")].append(restaurant)

    if ascending: #sorts restaurants by ascending price
        for price_category in prices[1:]:
            for restaurant in price_category:
                to_ret.append(restaurant)
    else: #sorts restaurants by descending price
        for price_category in prices[:0:-1]:
            for restaurant in price_category:
                to_ret.append(restaurant)

    for restaurant in prices[0]: #adds the N/A values to the end of the dict
        to_ret.append(restaurant)
    
    return to_ret


#N/A values come last in the list. descending by default
def sortRating(data_list: list[dict[Hashable, Any]], ascending=False) -> list[dict[Hashable, Any]]: 
    to_ret = []
    ratings = [[], [], [], [], [], [], [], [], [], [], [], []] #index 0-10 hold ratings, which are in .5 increments, index 11 holds N/A values

    for restaurant in data_list[1:]: #reads every line except the first and puts each one into the ratings list
        if pd.isna(restaurant["rating"]): #N/A value
            ratings[11].append(restaurant)
        else: #Non N/A value
            ratings[int(round(restaurant["rating"] * 2))].append(restaurant)

    if ascending: #sorts restaurants by ascending ratings
        for rating_category in ratings[:11]:
            for restaurant in rating_category:
                to_ret.append(restaurant)
    else: #sorts restaurants by descending ratings
        for rating_category in ratings[10::-1]:
            for restaurant in rating_category:
                to_ret.append(restaurant)

    for restaurant in ratings[11]: #adds the N/A values to the end of the dict
            to_ret.append(restaurant)
    
    return to_ret


# Helper function for sorting by location; adds a restaurant's distance to the user's address to the list of distances
def addDistance(user_address, restaurant, dists):
    # Google Place API call
    response = requests.get("https://maps.googleapis.com/maps/api/distancematrix/json", {
        'origins': user_address,
        'destinations': restaurant["restaurant_address"],
        'key': "AIzaSyCRoYlklKKJ7ZKSwRqeW68UaailZGmf8es"
    })
    if response.status_code == 200:
        if response.json().get('status') == 'OK':
            # if the JSON response is valid, get the distance, convert it to miles, and add it to the list of distances
            if response.json()['rows'][0]['elements'][0].get('status') == 'OK':
                dist = response.json()['rows'][0]['elements'][0]['distance']['text']
                dist = round((float(dist.split(" ")[0]) / 1.60934), 2)
                dists[f"{restaurant["restaurant_address"]}"] = dist
            else:
                print("api request failed")
        else:
            print("api request failed")
    else:
        print("api request failed")


#This next function would only be called for testing from this file.
#You can try parameters here. Leave the ascending? parameter blank to use the default for each. If you don't pass in a dict, it will just make a new one
if __name__ == "__main__": 
    data_list = main("pizza")

    for item in data_list: #prints sorted list
        print(*item.values())
