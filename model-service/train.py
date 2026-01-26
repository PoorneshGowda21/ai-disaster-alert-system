import pandas as pd
from sklearn.tree import DecisionTreeClassifier
import joblib

data = pd.read_csv("data/train.csv")

X = data[["rainfall", "reports"]]
y = data["risk"]

model = DecisionTreeClassifier()
model.fit(X, y)

joblib.dump(model, "model.pkl")
print("Model trained and saved")
