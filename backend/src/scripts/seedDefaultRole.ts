// backend/src/scripts/seedDefaultRole.ts
import { AppDataSource } from '../database';
import { Role } from '../Role';

export async function seedDefaultRole() {
  try {
    await AppDataSource.initialize();
    
    const roleRepository = AppDataSource.getRepository(Role);
    
    // Check if default role exists
    let userRole = await roleRepository.findOne({ where: { name: 'User' } });
    
    if (!userRole) {
      // Create default role
      userRole = new Role();
      userRole.name = 'User';
      userRole.description = 'Default user role';
      userRole.isActive = true;
      
      await roleRepository.save(userRole);
      console.log('Default user role created');
    }
    
    // Check if admin role exists
    let adminRole = await roleRepository.findOne({ where: { name: 'Admin' } });
    
    if (!adminRole) {
      // Create admin role
      adminRole = new Role();
      adminRole.name = 'Admin';
      adminRole.description = 'Administrator role with full access';
      adminRole.isActive = true;
      
      await roleRepository.save(adminRole);
      console.log('Admin role created');
    }
    
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error seeding default role:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  seedDefaultRole();
}