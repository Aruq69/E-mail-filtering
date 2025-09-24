-- Remove the test user "User" that was created during setup
DELETE FROM public.user_roles WHERE user_id = 'dbf2eb97-a216-4949-a276-30308608d311';
DELETE FROM public.profiles WHERE user_id = 'dbf2eb97-a216-4949-a276-30308608d311' AND username = 'User';