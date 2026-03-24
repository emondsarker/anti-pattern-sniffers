import { Controller, Get, Delete, Param } from '@nestjs/common';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardData();
  }
}
