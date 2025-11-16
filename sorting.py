'''
This code reads the .csv file, puts it into an object, and has functions
for sorting the ratings and prices WITHOUT the built in sortingfunctions.
 
For my testing, I just had the .csv in the same folder as the file. If they are in different folders, 
some changes might need to be made to how it is read
'''


'''
use this to call it from another file:

import sorting
sorting.main("tag", "sort_method", ascending?)


1. Ascending should be a boolean, with True to sort by ascending, and False to sort by descending
2. The tag sort will keep any restaurants with tags which hold the entered tag as a substring
3. the sort_method can be "location", "price", or "rating"
4. It currently will print part of the list on its own, which is there for testing. although, it will also return the sorted list
5. To increase the amount printed, adjust the modulo valie towards the end of main()
'''


#SUGGESTION: Once the function for sorting by location is written, use it on each list in the counting sort lists so that they will be ordered secondarily by location
import pandas as pd
from typing import Any, Hashable

def main(tag="none", sort_method="location", ascending=None) -> list[dict[Hashable, Any]]: #defaults to sorting by location for all restaurants
    # Load data to dictionary
    df = pd.read_csv("YELP.Restaurants.csv", usecols=["restaurant_name", "restaurant_address", "restaurant_tag", "rating", "price"])
    data_list = df.to_dict("records")

    tag = str(tag).lower() #these lines make sure that the tag and sort method are lowercase strings
    sort_method = str(sort_method).lower()

    if tag != "none": #sort by tag based on what is passed in
        data_list = sortTags(data_list, tag)

    if sort_method == "location": #use sort method based on what is passed in
        #SORT BY LOCATION GOES HERE
        print("location sort not added yet")
    elif sort_method == "price":
        data_list = sortPrice(data_list, ascending)
    elif sort_method == "rating":
        data_list = sortRating(data_list, ascending)
    else: 
        print("sorting option not recognized")

    count = 0
    for item in data_list: #printing sorted list
        count += 1
        if count % 5 == 0: 
            print(*item.values())

    return data_list
'''
the counter is here so that you can see values from across the list, 
and not just the end of it that the IDE doesn't cut off. You might want to remove this print function in the actual program
if you plan to catch the returned data set and print it somewhere else.
'''
    
        


def sortTags(data_list: list[dict[Hashable, Any]], tag: str) -> list[dict[Hashable, Any]]:
    to_ret = []

    for restaurant in data_list[1:]: #puts every restaurant with the listed tag into the list, without case sensitivity
        if not (pd.isna(restaurant["restaurant_tag"])) and (tag in restaurant["restaurant_tag"].lower()):
            to_ret.append(restaurant)

    return to_ret

    
#N/A values come last in the list. ascending by default
def sortPrice(data_list: list[dict[Hashable, Any]], ascending=True) -> list[dict[Hashable, Any]]:
    to_ret = []
    prices = [[], [], [], [], []] #index 1-4 hold 1-4 dollar sign values, index 0 holds N/A values

    for restaurant in data_list[1:]: #reads every line except the first and puts each one into the prices list
        if pd.isna(restaurant["price"]):
            prices[0].append(restaurant)
        else:
            prices[restaurant["price"].count("$")].append(restaurant)

    if ascending:
        for price_category in prices[1:]:
            for restaurant in price_category:
                to_ret.append(restaurant)
    else:
        for price_category in prices[:0:-1]:
            for restaurant in price_category:
                to_ret.append(restaurant)

    for restaurant in prices[0]:
        to_ret.append(restaurant)
    
    return to_ret


#N/A values come last in the list. descending by default
def sortRating(data_list: list[dict[Hashable, Any]], ascending=False) -> list[dict[Hashable, Any]]: 
    to_ret = []
    ratings = [[], [], [], [], [], [], [], [], [], [], [], []] #index 0-10 hold ratings, which are in .5 increments, index 11 holds N/A values

    for restaurant in data_list[1:]: #reads every line except the first and puts each one into the ratings list
        if pd.isna(restaurant["rating"]):
            ratings[11].append(restaurant)
        else:
            ratings[int(round(restaurant["rating"] * 2))].append(restaurant)

    if ascending:
        for rating_category in ratings[:11]:
            for restaurant in rating_category:
                to_ret.append(restaurant)
    else:
        for rating_category in ratings[10::-1]:
            for restaurant in rating_category:
                to_ret.append(restaurant)

    for restaurant in ratings[11]:
            to_ret.append(restaurant)
    
    return to_ret


if __name__ == "__main__": #This would only be called for testing from this file. You can try parameters here
    main("seafood", "price")

