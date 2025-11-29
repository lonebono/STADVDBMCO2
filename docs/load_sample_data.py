import csv
import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='mco2',
    password='stadvdbgroup10',
    database='imdbDDB'
)
cur = conn.cursor()

with open('STADVDBMCO2/docs/sample.title.basics.tsv') as f:
    reader = csv.reader(f, delimiter='\t')
    for row in reader:
        cur.execute(
            "INSERT INTO title_basics (tconst, titleType, primaryTitle, startYear, runtimeMinutes) VALUES (%s,%s,%s,%s,%s)",
            row
        )

conn.commit()
cur.close()
conn.close()
