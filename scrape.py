from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
import json
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import pickle
import os
import random
import scipy.stats

geolocator = Nominatim(user_agent='Carmaps')

storeCache = dict()

REMOVE = [
    'trim', 'badgeTitles', 'body', 'comingSoonDate', 'cylinders', 'driveTrain',
    'engineSize', 'engineTorque', 'engineTorqueRpm', 'engineType', 'exteriorColor',
    'features', 'fuelType', 'highlights', 'horsepower', 'horsepowerRpm', 'imageCount', 
    'interiorColor', 'isComingSoon', 'isMarkdown', 'isNew', 'isNewArrival', 
    'lastMadeSaleableDate', 'markdownAmount', 'mpgCity', 'mpgHighway', 'newTireCount', 
    'numberOfReviews', 'priorUses', 'review', 'stateAbbreviation', 'storeCity', 
    'storeId', 'transferTags', 'transmission'
]

locations = dict()

def setupLocations(useCache=True):
    '''
    still missing the following states:
    oklahoma, oregon, pennsylvania, rhode island, south carolina, tennessee
    texas, utah, virginia, washington, wisconsin
    '''
    global locations
    if useCache and os.path.exists('locationCache.p'):
        with open('locationCache.p', 'rb') as f:
            locations = pickle.load(f)
        return

    with open('locations.txt') as f:
        text = f.read()
    for line in text.split('\n\n'):
        if not line: continue
        line0, line1 = line.splitlines()
        name, street = line0.split(',')
        address = street.strip() + ' ' + line1.strip()
        storeZip = line1.strip()[-5:]
        print(name, address)
        location = geolocator.geocode(address)
        if location == None:
            location = geolocator.geocode(line1)
        locations[storeZip] = location
    
    with open('locationCache.p', 'wb+') as f:
        pickle.dump(locations, f)

def getNearest(userLocation):
    userPoint = userLocation.point
    storeLocations = list(locations.values())
    distances = [geodesic(store.point, userPoint).miles for store in storeLocations]
    return sorted(zip(storeLocations, distances), key=lambda s: s[1])

# def getDistance(userLocation, storeZip):
#     if not (storeLocation := storeCache.get(storeZip, None)):
#         print(storeZip)
#         storeLocation = geolocator.geocode(f'{storeZip}, USA')
#         storeCache[storeZip] = storeLocation
#     return geodesic(userLocation.point, storeLocation.point)

'''def cleanCarmaxData(carmaxData, userLocation):
    for carData in carmaxData:
        #dist = getDistance(userLocation, carData['storeZip'])
        #carData['distanceToUser'] = dist
        for category in REMOVE:
            carData.pop(category)'''
    
distCache = dict()

def getDistance(userLocation, storeZip):
    if not (res := distCache.get(storeZip, None)):
        print(storeZip)
        storeLocation = locations.get(storeZip)
        if storeLocation == None:
            storeLocation = geolocator.geocode(f'{storeZip}, USA')
        distance = geodesic(userLocation.point, storeLocation.point)
        res = (distance, storeLocation)
        distCache[storeZip] = res
    return res


def cleanCarmaxData(carmaxData, userLocation):
    rx, ry, rz = [], [], []
    for carData in carmaxData:
        dist, storeLocation = getDistance(userLocation, carData['storeZip'])
        fee = carData['transferFee']
        if not fee:
            fee = 0
        rx.append(dist.miles)
        ry.append(fee)
        rz.append(storeLocation)

    return rx, ry, rz

def scrape(driver, zipcode, skip, take, radius, sort, make):
    url = f'https://www.carmax.com/cars/api/search/run?uri=%2Fcars%2F' + \
          f'{make}&skip={skip}&take={take}&radius={radius}&zipCode={zipcode}&sort={sort}'

    driver.get(url)
    data = json.loads(driver.find_element_by_id('json').text)
    return data

def handleRequest(request):
    '''
    Precondition: request is dict contianing keys center, zip, radii
    '''
    print(request)
    userZip = request['zip']
    radii = request['radii']
    global distCache
    distCache = dict()
    setupLocations()
    data = []
    userLocation = geolocator.geocode(f'{userZip}, USA')
    #userLocation = geolocator.geocode(f"{center['lat']}, {center['lng']}")
    # if userLocation == None:
    nearest = getNearest(userLocation)
    print(nearest)
    result = dict()
    result['storesInRadii'] = [[] for _ in range(len(radii))]

    for store, distance in nearest:
        for i, r in enumerate(radii):
            if distance <= r:
                break
        data = {'storeCoords': tuple(store.point), 'storeAddress': store.address, 'distance': distance}
        
        result['storesInRadii'][i].append(data)

    options = Options()
    options.headless = True
    with webdriver.Firefox(options=options) as driver:
        res = scrape(driver, userZip, 0, 100, 5000, 20, 'all')
        distance, transferFees, storeLocations = cleanCarmaxData(res['items'], userLocation)
        total = res['totalCount']
        validRange = range(100, total, 100)
        seen = set()
        for i in range(min(3, total//100)):
            # 'random' sampling
            try:
                while (offset := random.choice(validRange)) in seen:
                    pass
                res = scrape(driver, userZip, offset, 100, 5000, 20, 'all')
                x, y, z = cleanCarmaxData(res['items'], userLocation)
                distance.extend(x)
                transferFees.extend(y)
                storeLocations.extend(z)
            except:
                print('fuck')

    result['bestFit'] = dict()

    slope, intercept, r_value, p_value, std_err = scipy.stats.linregress(distance, transferFees)
    result['bestFit']['slope'] = slope
    result['bestFit']['intercept'] = intercept
    result['bestFit']['rValue'] = r_value
    result['bestFit']['pValue'] = p_value
    result['bestFit']['stdErr'] = std_err

    result['carsInRadii'] = [[] for _ in range(len(radii))]
    for dist, fee, store in zip(distance, transferFees, storeLocations):
        for i, r in enumerate(radii):
            if dist <= r:
                break
        data = {'distance': dist, 'storeCoords': tuple(store.point), 'storeAddress': store.address, 'fee': fee}
        result['carsInRadii'][i].append(data)

    result['stats'] = [dict() for _ in range(len(radii))]
    for i, d in enumerate(result['stats']):
        nums = [p['fee'] for p in result['carsInRadii'][i]]
        if nums == []:
            d['min'] = 0
            d['max'] = 0
            d['median'] = 0
            d['average'] = 0
            continue
        nums.sort()
        d['min'] = min(nums)
        d['max'] = max(nums)
        d['median'] = nums[len(nums)//2]
        d['average'] = sum(nums) / len(nums)
    return result


if __name__ == "__main__":
    request = {
        'center': {'lat': 30.5483, 'lng': -77.4527}, 
        'zip': '90210', 
        'radii': [50, 100, 200, 300]
    }
    result = handleRequest(request)
    jsonResult = json.dumps(result)
    # ZIPCODE = '08820'
    # res = scrape(ZIPCODE, 0, 100, 5000, 20, 'all')
    # userLocation = geolocator.geocode(f'{ZIPCODE}, USA')
    # distance, transferFees = cleanCarmaxData(res['items'], userLocation)
    
