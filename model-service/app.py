from flask import Flask, request, jsonify
import joblib

app = Flask(__name__)
model = joblib.load("model.pkl")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    rainfall = data.get("rainfall", 0)
    reports = data.get("reports", 0)

    prediction = model.predict([[rainfall, reports]])[0]

    return jsonify({
        "risk": prediction,
        "rainfall": rainfall,
        "reports": reports
    })

app.run(host="0.0.0.0", port=5001)
