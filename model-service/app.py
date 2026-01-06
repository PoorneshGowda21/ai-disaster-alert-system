from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return "Model service is running"

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    area = data.get("area", "Unknown")

    return jsonify({
        "risk_score": 0.63,
        "confidence": 0.81,
        "area": area
    })

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)
