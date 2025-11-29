# update system
apt update && apt upgrade -y

# isntall MySQL
apt install -y mysql-server
systemctl enable mysql
systemctl start mysql

# allow remote MySQL access
sed -i "s/^bind-address.*/bind-address = 0.0.0.0/" /etc/mysql/mysql.conf.d/mysqld.cnf
systemctl restart mysql

# create database and user
mysql -e "CREATE DATABASE IF NOT EXISTS imdbDDB;"
mysql -e "CREATE USER IF NOT EXISTS 'mco2'@'%' IDENTIFIED BY 'stadvdbgroup10';"
mysql -e "GRANT ALL PRIVILEGES ON imdbDDB.* TO 'mco2'@'%'; FLUSH PRIVILEGES;"

# install git
apt install -y git #install git to node 1 and 2

# did not use below yet

# install curl
apt install -y curl

# install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt install -y nodejs

# install pm2 (process manager)
npm install -g pm2

# set pm2 to start on boot
pm2 start server.js --name webapp
pm2 save
pm2 startup
