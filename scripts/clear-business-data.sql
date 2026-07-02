-- ─── 清空 PocketBase 业务数据 ───────────────────────────────────
-- 保留系统/配置数据：user_profiles, push_tokens, ai_configs, custom_wuxing_maps
-- 清空所有业务数据

-- 开始事务
BEGIN TRANSACTION;

-- 清空业务数据表
DELETE FROM habits;
DELETE FROM reflections;
DELETE FROM fasting_sessions;
DELETE FROM food_entries;
DELETE FROM checkin_records;
DELETE FROM meditation_history;
DELETE FROM exercise_entries;
DELETE FROM plans;
DELETE FROM plan_items;
DELETE FROM plan_item_checkins;
DELETE FROM grace_history;
DELETE FROM daily_custom_todos;
DELETE FROM daily_todo_history;
DELETE FROM thought_trails;
DELETE FROM trail_notes;
DELETE FROM reflection_links;
DELETE FROM checkin_reviews;
DELETE FROM body_goals;
DELETE FROM body_plans;
DELETE FROM weight_records;
DELETE FROM body_checkins;
DELETE FROM sleep_records;
DELETE FROM give_entries;
DELETE FROM eating_motivations;
DELETE FROM visions;
DELETE FROM vision_practices;
DELETE FROM dedications;
DELETE FROM mantra_defs;
DELETE FROM mantra_sessions;
DELETE FROM sutra_reading_sessions;
DELETE FROM fear_entries;
DELETE FROM courage_entries;
DELETE FROM fear_achievements;
DELETE FROM zhiguan_sessions;
DELETE FROM breath_records;
DELETE FROM published_minds;

-- 提交事务
COMMIT;

-- 显示清理结果
SELECT 'habits' as table_name, COUNT(*) as remaining FROM habits
UNION ALL SELECT 'reflections', COUNT(*) FROM reflections
UNION ALL SELECT 'fasting_sessions', COUNT(*) FROM fasting_sessions
UNION ALL SELECT 'food_entries', COUNT(*) FROM food_entries
UNION ALL SELECT 'checkin_records', COUNT(*) FROM checkin_records
UNION ALL SELECT 'meditation_history', COUNT(*) FROM meditation_history
UNION ALL SELECT 'exercise_entries', COUNT(*) FROM exercise_entries
UNION ALL SELECT 'plans', COUNT(*) FROM plans
UNION ALL SELECT 'plan_items', COUNT(*) FROM plan_items
UNION ALL SELECT 'plan_item_checkins', COUNT(*) FROM plan_item_checkins
UNION ALL SELECT 'grace_history', COUNT(*) FROM grace_history
UNION ALL SELECT 'daily_custom_todos', COUNT(*) FROM daily_custom_todos
UNION ALL SELECT 'daily_todo_history', COUNT(*) FROM daily_todo_history
UNION ALL SELECT 'thought_trails', COUNT(*) FROM thought_trails
UNION ALL SELECT 'trail_notes', COUNT(*) FROM trail_notes
UNION ALL SELECT 'reflection_links', COUNT(*) FROM reflection_links
UNION ALL SELECT 'checkin_reviews', COUNT(*) FROM checkin_reviews
UNION ALL SELECT 'body_goals', COUNT(*) FROM body_goals
UNION ALL SELECT 'body_plans', COUNT(*) FROM body_plans
UNION ALL SELECT 'weight_records', COUNT(*) FROM weight_records
UNION ALL SELECT 'body_checkins', COUNT(*) FROM body_checkins
UNION ALL SELECT 'sleep_records', COUNT(*) FROM sleep_records
UNION ALL SELECT 'give_entries', COUNT(*) FROM give_entries
UNION ALL SELECT 'eating_motivations', COUNT(*) FROM eating_motivations
UNION ALL SELECT 'visions', COUNT(*) FROM visions
UNION ALL SELECT 'vision_practices', COUNT(*) FROM vision_practices
UNION ALL SELECT 'dedications', COUNT(*) FROM dedications
UNION ALL SELECT 'mantra_defs', COUNT(*) FROM mantra_defs
UNION ALL SELECT 'mantra_sessions', COUNT(*) FROM mantra_sessions
UNION ALL SELECT 'sutra_reading_sessions', COUNT(*) FROM sutra_reading_sessions
UNION ALL SELECT 'fear_entries', COUNT(*) FROM fear_entries
UNION ALL SELECT 'courage_entries', COUNT(*) FROM courage_entries
UNION ALL SELECT 'fear_achievements', COUNT(*) FROM fear_achievements
UNION ALL SELECT 'zhiguan_sessions', COUNT(*) FROM zhiguan_sessions
UNION ALL SELECT 'breath_records', COUNT(*) FROM breath_records
UNION ALL SELECT 'published_minds', COUNT(*) FROM published_minds;
