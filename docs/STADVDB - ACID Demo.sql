-- SET autocommit = 0;

CREATE SCHEMA stadvdb;

USE stadvdb;

DROP TABLE IF EXISTS product;

CREATE TABLE product (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(255),
    price DECIMAL(10, 2),
    stock_count INT,
    CHECK (price > 0) -- Assertion: product price must be positive
);

INSERT INTO product VALUES (1, "Product 1", 0, 0); -- ERROR price < 0
INSERT INTO product VALUES (1, "Product 1", 50000, 100); -- ERROR price < 0


SHOW CREATE TABLE product; -- SHOW DDL of product

-- Enforcing Constraints
ALTER TABLE DROP CONSTRAINT product_chk_1;
ALTER TABLE product ADD CONSTRAINT product_chk_stockcount CHECK(stock_count > 0);

UPDATE product
SET price = price - 100000
WHERE product_id = 1; -- Error due to constraint

DROP TABLE IF EXISTS audit_log; 
CREATE TABLE audit_log (
    action VARCHAR(45),
    table_name VARCHAR(45),
    product_id INT,
    level VARCHAR(45)
);

-- CREATE TRIGGER
DELIMITER $$

CREATE TRIGGER product_movement_audit
AFTER UPDATE ON product
FOR EACH ROW
BEGIN
  IF NEW.stock_count < 10 THEN
    INSERT INTO audit_log VALUES('UPDATE', 'product', OLD.product_id, 'OUT OF STOCK WARNING');
  ELSE
    INSERT INTO audit_log VALUES('UPDATE', 'product', OLD.product_id, 'UPDATE STOCK');
  END IF;
END$$

DELIMITER ;

-- SIMULATING TRANSACTION DURABILITY --
BEGIN;
  INSERT INTO product VALUES (2, 'Product 2', 1000, 10);
  UPDATE product SET stock_count = 500 WHERE product_id = 1;
-- COMMIT; -- 
-- ROLLBACK;

-- MYSQL Logs
SHOW BINARY LOGS;
C:\ProgramData\MySQL\MySQL Server 9.3\Data -- WHERE THE LOGFILES ARE RECORDED

mysqlbinlog --base64-output=DECODE-ROWS -v "C:\ProgramData\MySQL\MySQL Server 9.3\Data\LELAND-bin.000020"

-- DEMO TRANSACTION STATES
ALTER TABLE product ADD CONSTRAINT product_chk_stockcount CHECK(stock_count > 0);

BEGIN;
  UPDATE product SET stock_count = stock_count - 1000 WHERE product_id = 2;
  INSERT INTO product values (3, 'product 3', 2000, 20);
COMMIT;
