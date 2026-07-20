CREATE TABLE IF NOT EXISTS activity_log (
  id INT NOT NULL AUTO_INCREMENT,
  actor_id INT NULL,
  actor_name VARCHAR(255) NULL,
  actor_role VARCHAR(100) NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INT NULL,
  entity_label VARCHAR(255) NULL,
  summary TEXT NOT NULL,
  details TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_activity_log_created_at (created_at),
  INDEX idx_activity_log_actor_id (actor_id),
  INDEX idx_activity_log_entity (entity_type, action)
);
