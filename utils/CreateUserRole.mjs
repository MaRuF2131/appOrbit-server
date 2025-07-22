

const CreateUserRole =  async (email,name,role,db) => {
   try{
     // Your logic to create a user role
     const userRole = {
         email: email,
         name: name,
         role: role || 'user',
         createdAt: new Date()
        };
        console.log("Creating user role:", userRole);
        // Check if the user already exists
        const existingUser = await db.collection('user_roles').findOne({ email: userRole.email });
        console.log("Existing user found:", existingUser);
        // If the user does not exist, create a new user role
        if (!existingUser || !existingUser.name) {
            console.log('buggggg');    
            const result = await db.collection('user_roles').insertOne(userRole);
            return { ok: true, status: 201, message: 'User role created successfully', user: { ...result, role: 'user' } };
        }
        console.log("User already exists, updating role:", userRole.email);
        // Update the existing user role
        return { ok: true, status: 200, message: 'User role updated successfully', user: existingUser };
   } catch (error) {
     console.error("Error creating user role:", error);
      return { ok: false, status: 500, message: 'Failed to create user role' };
   }
}

export default CreateUserRole
