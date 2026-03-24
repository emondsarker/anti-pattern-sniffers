import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService,
    private cacheService: CacheService,
  ) {}

  async create(data: CreateUserDto) { return {}; }
  async findById(id: string) { return {}; }
  async update(id: string, data: UpdateUserDto) { return {}; }
  async delete(id: string) { return {}; }
  async list() { return []; }
}
