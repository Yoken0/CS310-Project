import pandas as pd
from typing import Any, Hashable

def main(tag="none", sort_method="location", ascending=None) -> list[dict[Hashable, Any]]: #defaults to sorting by location, ascending for all restaurants
    # Load data to dictionary
    df = pd.read_csv("YELP.Restaurants.csv", usecols=["restaurant_name", "restaurant_address", "restaurant_tag", "rating", "price"]) #reads the listed columns and puts them into a dict
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


    for item in data_list: #prints sorted list
        print(*item.values()) 

    '''
    count = 0
    for item in data_list: #printing SOME, but not all elements from across the list
        count += 1
        if count % 5 == 0: 
            print(*item.values())

    return data_list

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

    
#Returns list sorted by price, either ascending or descending depending on what was chosesn. N/A values always come last in the list. ascending by default
def sortPrice(data_list: list[dict[Hashable, Any]], ascending=True) -> list[dict[Hashable, Any]]: 
    to_ret = []
    prices = [[], [], [], [], []] #index 1-4 hold 1-4 dollar sign values, index 0 holds N/A values

    for restaurant in data_list[1:]: #reads every line except the first and puts each one into the prices list for counting sort
        if pd.isna(restaurant["price"]): #N/A value
            prices[0].append(restaurant)
        else: #Non N/A value
            prices[restaurant["price"].count("$")].append(restaurant)


#Once the code for sorting by locations is done, I'll apply it to each index of the counting sort array so that they will be sorted secondarily by location


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


#Once the code for sorting by locations is done, I'll apply it to each index of the counting sort array so that they will be sorted secondarily by location


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


#This next function would only be called for testing from this file. 
#You can try parameters here. Leave the ascending? parameter blank to use the default for each
if __name__ == "__main__": 
    main("seafood", "price")

