CREATE DATABASE IF NOT EXISTS campuseats;
USE campuseats;

CREATE TABLE IF NOT EXISTS dishes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO dishes (name, price, available) VALUES
  ('Paneer Tikka Sandwich', 80.00, TRUE),
  ('Veg Hakka Noodles', 110.00, TRUE),
  ('Masala Dosa', 70.00, TRUE),
  ('Cold Coffee', 60.00, FALSE);