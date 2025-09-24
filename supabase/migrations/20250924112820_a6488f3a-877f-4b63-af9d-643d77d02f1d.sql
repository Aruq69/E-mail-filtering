-- Make areftestacc@outlook.com an admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('84701187-edc3-4215-8550-92de3424d706', 'admin')
ON CONFLICT (user_id, role) 
DO UPDATE SET role = 'admin', updated_at = now();