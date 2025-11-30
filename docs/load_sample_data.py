import csv
import mysql.connector # type: ignore

conn = mysql.connector.connect(
    host='localhost',
    user='mco2',
    password='stadvdbgroup10',
    database='imdbDDB'
)
cur = conn.cursor()

with open('sample.title.basics.tsv') as f:
    reader = csv.reader(f, delimiter='\t')
    for row in reader:
        tconst, titleType, primaryTitle, startYear, runtimeMinutes = row
        
        # Convert \N to None
        startYear = int(startYear) if startYear != r'\N' else None
        runtimeMinutes = int(runtimeMinutes) if runtimeMinutes != r'\N' else None

        cur.execute(
            "INSERT INTO title_basics (tconst, titleType, primaryTitle, startYear, runtimeMinutes) VALUES (%s,%s,%s,%s,%s)",
            (tconst, titleType, primaryTitle, startYear, runtimeMinutes)
        )

conn.commit()
cur.close()
conn.close()
