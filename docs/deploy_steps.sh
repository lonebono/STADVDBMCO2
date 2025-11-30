# ssh into node
ssh root@ccscloud.dlsu.edu.ph -p 60505 # server 0
ssh root@ccscloud.dlsu.edu.ph -p 60506 # server 1
ssh root@ccscloud.dlsu.edu.ph -p 60507 # server 2

# update system
apt update
apt install -y curl build-essential

# Install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
apt install -y nodejs

# check node and npm versions
node -v
npm -v

# git clone repo if not yet cloned else git pull
git clone https://github.com/lonebono/STADVDBMCO2.git
git pull origin main

# navigate to project directory
cd root/STADVDBMCO2/webapp

# install .env.local file
nano .env.local
# VM0 CONTENT:
DB_USER=mco2
DB_PASS=w5EuLsQ8WHk2XyfJaZhSNen4
DB_NAME=imdbDDB
DB_HOST=localhost
SERVER0_PORT=3306
SERVER1_PORT=60806
SERVER2_PORT=60807
# VM1 CONTENT:
DB_USER=mco2
DB_PASS=w5EuLsQ8WHk2XyfJaZhSNen4
DB_NAME=imdbDDB
DB_HOST=localhost
SERVER0_PORT=60805
SERVER1_PORT=3306
SERVER2_PORT=60807
# VM2 CONTENT:
DB_USER=mco2
DB_PASS=w5EuLsQ8WHk2XyfJaZhSNen4
DB_NAME=imdbDDB
DB_HOST=localhost
SERVER0_PORT=60805
SERVER1_PORT=60806
SERVER2_PORT=3306

# install dependencies
npm install

# build and start the app
npm run build
PORT=80 npm run start

# access the web app at
http://ccscloud.dlsu.edu.ph:60205 # server 0
http://ccscloud.dlsu.edu.ph:60206 # server 1
http://ccscloud.dlsu.edu.ph:60207 # server 2
