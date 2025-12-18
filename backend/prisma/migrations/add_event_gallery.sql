-- Create event_gallery table for storing multiple photos per event
CREATE TABLE IF NOT EXISTS event_gallery (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_id INT NOT NULL,
  image VARCHAR(255) NOT NULL,
  caption TEXT,
  uploaded_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES user(id) ON DELETE SET NULL,
  INDEX idx_event_id (event_id)
);
