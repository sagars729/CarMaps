from flask import Flask, jsonify, request
from scrape import handleRequest
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# @app.after_request
# def after_request(response):
#     response.headers.add('Access-Control-Allow-Origin', '*')
#     response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
#     response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
#     return response

@app.route('/', methods=['GET'])
def main():
    print(request)
    print(request.args)
    userZip = request.args['zip']
    radii = request.args.getlist('radii')
    if not radii:
        radii = request.args.getlist('radii[]')
    print(userZip)
    print(radii)
    if not(userZip and radii):
        return 'Error'
    radii = [int(r) for r in radii]
    req = {'zip': userZip, 'radii': radii}
    print(req)
    if (req == None):
        return 'Error'
    result = handleRequest(req)
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True, port=5000)