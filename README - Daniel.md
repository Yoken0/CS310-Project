This code reads the .csv file, puts it into an object, and has functions
for sorting the ratings and prices WITHOUT the built in sortingfunctions.
 
For my testing, I just had the .csv in the same folder as the file. If they are in different folders, 
some changes might need to be made to how it is read


Enter this command to install Pandas:
pip install pandas


You can test it with if __name__ == "__main__": function at the bottom


Use this to call it from another file:

import sorting
sorting.main("tag", "sort_method", ascending?)

Usage Notes:
1. Ascending should be a boolean, with True to sort by ascending, and False to sort by descending
2. The tag sort will keep any restaurants with tags which hold the entered tag as a substring
3. the sort_method can be "location", "price", or "rating"
4. It currently will print part of the list on its own, which is there for testing. although, it will also return the sorted list
5. To increase the amount printed, adjust the modulo value towards the end of main()