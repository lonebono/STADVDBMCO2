-- SSH into the Central Node first

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
    runtimeMinutes INT
);

