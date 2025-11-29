-- SSH into the Central Node first
ssh root@ccscloud.dlsu.edu.ph -p 60505

-- connect
mysql -u mco2 -p
-- password: stadvdbgroup10

-- create table
USE imdbDDB;
SHOW DATABASES;
CREATE TABLE title_basics (
    tconst VARCHAR(20) PRIMARY KEY,
    titleType VARCHAR(50),
    primaryTitle VARCHAR(500),
    startYear INT,
    runtimeMinutes INT NULL
);

-- install pip and mysql connector for python3
apt update
apt install -y python3-pip

pip3 install mysql-connector-python

-- run the python script to load data 
python3 load_sample_data.py

-- check if data is loaded
SELECT COUNT(*) FROM title_basics;

SELECT * FROM title_basics LIMIT 10;
