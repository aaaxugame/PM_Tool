import { IsDateString } from 'class-validator';

export class CreateTimesheetDto {
  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;
}
