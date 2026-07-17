import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class RegisterDeviceDto {
  @IsString() token!: string;
  @IsIn(["android", "ios", "web"]) platform!: string;
  @IsOptional() @IsString() appVersion?: string;
  @IsOptional() @IsString() locale?: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() @Min(30) @Max(300) weightKg?: number;
  @IsOptional() @IsNumber() @Min(50) @Max(260) heightCm?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(70) bodyFatPercentage?: number;
  @IsOptional() @IsString() objective?: string;
}

export class CreateExerciseDto {
  @IsString() name!: string;
  @IsString() category!: string;
  @IsString() equipment!: string;
  @IsString() primaryMuscle!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) secondaryMuscles?: string[];
}

export class WorkoutExerciseDto {
  @IsString() exerciseId!: string;
  @IsInt() @IsPositive() sets!: number;
  @IsString() reps!: string;
  @IsNumber() @Min(0) loadKg!: number;
  @IsInt() @Min(0) restSeconds!: number;
}

export class CreateWorkoutDto {
  @IsString() name!: string;
  @IsString() subtitle!: string;
  @IsString() category!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => WorkoutExerciseDto) exercises!: WorkoutExerciseDto[];
}

export class PerformedSetDto {
  @IsString() exerciseId!: string;
  @IsInt() @Min(1) setNumber!: number;
  @IsNumber() @Min(0) loadKg!: number;
  @IsInt() @Min(0) reps!: number;
  @IsNumber() @Min(1) @Max(10) rpe!: number;
}

export class CreateSessionDto {
  @IsString() workoutId!: string;
  @IsString() startedAt!: string;
  @IsString() finishedAt!: string;
  @IsInt() @Min(0) durationSeconds!: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PerformedSetDto) sets!: PerformedSetDto[];
}

export class CreateGoalDto {
  @IsString() title!: string;
  @IsIn(["consistency", "strength", "running", "body-composition"]) category!: string;
  @IsNumber() current!: number;
  @IsNumber() target!: number;
  @IsString() unit!: string;
  @IsString() deadline!: string;
}
