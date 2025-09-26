-- Clean up all test emails with ml-classified message IDs
DELETE FROM emails WHERE message_id LIKE 'ml-classified-%';