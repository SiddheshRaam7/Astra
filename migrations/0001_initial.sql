CREATE TABLE IF NOT EXISTS user_profiles (user_id text PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS financial_snapshots (user_id text PRIMARY KEY REFERENCES user_profiles(user_id) ON DELETE CASCADE, version integer NOT NULL CHECK (version >= 0), data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS financial_accounts (user_id text NOT NULL REFERENCES user_profiles(user_id), id text NOT NULL, data jsonb NOT NULL, PRIMARY KEY(user_id,id));
CREATE TABLE IF NOT EXISTS income_sources (LIKE financial_accounts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS transactions (LIKE financial_accounts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS expense_categories (LIKE financial_accounts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS budgets (LIKE financial_accounts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS goals (LIKE financial_accounts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS recurring_payments (LIKE financial_accounts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS emergency_funds (LIKE financial_accounts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS scenario_simulations (LIKE financial_accounts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS ai_action_logs (id text PRIMARY KEY, user_id text NOT NULL REFERENCES user_profiles(user_id), data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS plaid_items (user_id text NOT NULL REFERENCES user_profiles(user_id), item_id text NOT NULL, encrypted_token text NOT NULL, cursor text, PRIMARY KEY(user_id,item_id));
CREATE INDEX IF NOT EXISTS transactions_user_date ON transactions(user_id, (data->>'date'));
CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_external ON transactions(user_id, (data->>'externalId')) WHERE data ? 'externalId';
CREATE INDEX IF NOT EXISTS ai_logs_user ON ai_action_logs(user_id,created_at DESC);
-- Tenant-scoped monthly spending analytics. Always filter user_id in the caller.
CREATE OR REPLACE VIEW monthly_spending AS
SELECT user_id, left(data->>'date',7) AS month, data->>'category' AS category,
  SUM((data->>'amount')::bigint) AS amount_cents, COUNT(*) AS transaction_count
FROM transactions WHERE data->>'kind' <> 'income' AND (data->>'pending')::boolean = false
GROUP BY user_id,left(data->>'date',7),data->>'category';
