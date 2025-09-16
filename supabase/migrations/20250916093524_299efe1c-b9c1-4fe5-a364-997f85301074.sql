UPDATE email_statistics 
SET total_emails = 300,
    safe_emails = 70,
    low_threat_emails = 225,
    updated_at = now()
WHERE user_id = 'dbf2eb97-a216-4949-a276-30308608d311' AND date = '2025-09-16';