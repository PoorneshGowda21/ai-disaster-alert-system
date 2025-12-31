import pandas as pd

df = pd.read_csv("data/rainfall.csv")

df = df[["SUBDIVISION", "YEAR", "JAN", "FEB", "MAR", "APR",
         "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]]

df = df.melt(id_vars=["SUBDIVISION", "YEAR"], var_name="MONTH", value_name="RAINFALL")

df.to_csv("data/cleaned_rainfall.csv", index=False)

print("Cleaned rainfall saved.")
