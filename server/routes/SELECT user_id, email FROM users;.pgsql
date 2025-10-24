SELECT user_id, email FROM users;

-- Assign the Super Admin role (we'll assign them to the 'Administration' department, ID 3)
INSERT INTO user_department_roles (user_id, department_id, role_id)
VALUES ('7af18ad2-4c91-4c16-a9e0-82fe3bbf984b', 3, 4);

-- Assign the Nodal Officer role (to the 'Hostel Affairs' department, ID 2)
INSERT INTO user_department_roles (user_id, department_id, role_id)
VALUES ('0a4fde57-8506-4d96-832b-679fcbd0e8f1', 2, 2);


SELECT
    u.user_id,
    u.full_name,
    u.email,
    r.role_name
FROM
    users AS u
JOIN
    user_department_roles AS udr ON u.user_id = udr.user_id
JOIN
    roles AS r ON udr.role_id = r.role_id
WHERE
    u.email = 'admin@dtu.ac.in';



-- Add verification token columns to users table
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;