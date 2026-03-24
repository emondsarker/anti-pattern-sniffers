import { Controller, Post, Put, Body, Param } from '@nestjs/common';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  create(@Body() body: any) {
    return this.usersService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: any, @Body() data: any) {
    return this.usersService.update(id, data);
  }
}
