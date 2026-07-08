import { IsString, IsNotEmpty } from 'class-validator';

export class ProposalNoteDto {
  @IsString()
  @IsNotEmpty()
  note: string;
}
