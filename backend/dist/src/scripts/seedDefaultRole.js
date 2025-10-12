"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDefaultRole = seedDefaultRole;
// backend/src/scripts/seedDefaultRole.ts
const database_1 = require("../database");
const Role_1 = require("../Role");
async function seedDefaultRole() {
    try {
        await database_1.AppDataSource.initialize();
        const roleRepository = database_1.AppDataSource.getRepository(Role_1.Role);
        // Check if default role exists
        let userRole = await roleRepository.findOne({ where: { name: 'User' } });
        if (!userRole) {
            // Create default role
            userRole = new Role_1.Role();
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
            adminRole = new Role_1.Role();
            adminRole.name = 'Admin';
            adminRole.description = 'Administrator role with full access';
            adminRole.isActive = true;
            await roleRepository.save(adminRole);
            console.log('Admin role created');
        }
        await database_1.AppDataSource.destroy();
    }
    catch (error) {
        console.error('Error seeding default role:', error);
    }
}
// Run if this file is executed directly
if (require.main === module) {
    seedDefaultRole();
}
//# sourceMappingURL=seedDefaultRole.js.map