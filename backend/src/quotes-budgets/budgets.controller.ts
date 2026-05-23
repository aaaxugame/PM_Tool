import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Controller('budgets')
@UseGuards(AuthGuard('jwt'))
export class BudgetsController {
  constructor(private budgetsService: BudgetsService) {}

  @Get()
  findAll(
    @Query('projectId') projectId?: string,
    @Query('taskId') taskId?: string,
  ) {
    return this.budgetsService.findAll({
      projectId: projectId ? Number(projectId) : undefined,
      taskId: taskId ? Number(taskId) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.budgetsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBudgetDto, @Req() req: any) {
    return this.budgetsService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBudgetDto) {
    return this.budgetsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.budgetsService.remove(id);
  }
}
