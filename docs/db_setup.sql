-- SSH into the Node first
ssh root@ccscloud.dlsu.edu.ph -p 60505 -- server 0
ssh root@ccscloud.dlsu.edu.ph -p 60506 -- server 1
ssh root@ccscloud.dlsu.edu.ph -p 60507 -- server 2

-- connect
mysql -u mco2 -p
-- password: w5EuLsQ8WHk2XyfJaZhSNen4

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

-- prep the fragments to transfer
mysqldump -u mco2 -p imdbDDB title_basics \
  --where="startYear < 1919 OR startYear IS NULL" \
  --no-tablespaces \
  > frag1.sql

mysqldump -u mco2 -p imdbDDB title_basics \
  --where="startYear >= 1919" \
  --no-tablespaces \
  > frag2.sql

-- transfer the fragments through IP
scp /root/frag1.sql root@10.2.14.106:/root/
scp /root/frag2.sql root@10.2.14.107:/root/

-- switch to fragment nodes

-- create the table in both fragment nodes
USE imdbDDB;
CREATE TABLE title_basics (
    tconst VARCHAR(20) PRIMARY KEY,
    titleType VARCHAR(50),
    primaryTitle VARCHAR(500),
    startYear INT,
    runtimeMinutes INT NULL
);

-- load the fragments respectively 
mysql -u mco2 -p imdbDDB < /root/frag1.sql
mysql -u mco2 -p imdbDDB < /root/frag2.sql

-- verify the data Node 1 and 2
SELECT * FROM title_basics
ORDER BY startYear DESC, tconst DESC
LIMIT 10; 

SELECT * FROM title_basics
ORDER BY startYear ASC, tconst ASC
LIMIT 10;

-- insert into all nodes for recovery logs

CREATE TABLE IF NOT EXISTS recovery_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    failed_node VARCHAR(50) NOT NULL,       -- failed node identifier
    transaction_data JSON NOT NULL,         -- data they missed
    status VARCHAR(20) DEFAULT 'PENDING',   -- 'PENDING' or 'RESOLVED'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);