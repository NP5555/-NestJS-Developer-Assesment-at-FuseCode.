import { IsInt, Min } from 'class-validator';

export class ConfirmOrderDto {
  @IsInt()
  @Min(0)
  totalCents: number;
}


