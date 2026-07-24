import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req, Res } from "@nestjs/common";
import { Readable } from "node:stream";
import { CreateExerciseDto, CreateGoalDto, CreateSessionDto, CreateWorkoutDto, RegisterDeviceDto, UpdateProfileDto } from "./contracts.js";
import { DatabaseService } from "./database.service.js";
import { MuscleWikiService } from "./musclewiki.service.js";

@Controller("api/v1")
export class AppController {
  constructor(private readonly database: DatabaseService, private readonly muscleWiki: MuscleWikiService) {}

  @Get("health")
  health() { return { status: "ok", service: "olympus-ai-api", version: "1.0.0", timestamp: new Date().toISOString() }; }

  @Get("app-config")
  appConfig() {
    return { minimumVersion: "0.1.0", latestVersion: "0.1.0", maintenance: false, features: { pushNotifications: true, offlineSync: true } };
  }

  @Post("devices") registerDevice(@Body() body: RegisterDeviceDto) { return this.database.registerDevice(body); }
  @Post("devices/unregister") unregisterDevice(@Body("token") token: string) { return this.database.unregisterDevice(token); }

  @Get("dashboard")
  dashboard() {
    const data = this.database.snapshot();
    const totalVolumeKg = data.sessions.reduce((total, session) => total + Number(session.volumeKg || 0), 0);
    return { profile: data.profile, totals: { workouts: data.sessions.length, totalVolumeKg }, recentSessions: data.sessions.slice(-5).reverse(), goals: data.goals };
  }

  @Get("profile") profile() { return this.database.profile(); }
  @Patch("profile") updateProfile(@Body() body: UpdateProfileDto) { return this.database.updateProfile(body); }

  @Get("exercises")
  exercises(@Query("category") category?: string, @Query("q") query?: string) {
    return this.database.exercises().filter((item) => (!category || item.category === category) && (!query || String(item.name).toLowerCase().includes(query.toLowerCase())));
  }
  @Post("exercises") createExercise(@Body() body: CreateExerciseDto) { return this.database.add("exercises", body); }

  @Get("musclewiki/status")
  muscleWikiStatus() { return { configured: this.muscleWiki.isConfigured() }; }

  @Get("musclewiki/resolve")
  muscleWikiResolve(
    @Query("localId") localId: string,
    @Query("name") name: string,
    @Query("nameEn") nameEn: string,
    @Query("equipment") equipment: string,
  ) {
    return this.muscleWiki.resolve({ localId: localId || nameEn || name, name: name || "", nameEn: nameEn || name || "", equipment: equipment || "" });
  }

  @Get("musclewiki/exercises/:id")
  muscleWikiExercise(@Param("id") id: string) {
    const exerciseId = Number(id);
    if (!Number.isSafeInteger(exerciseId) || exerciseId < 0) throw new BadRequestException("Invalid MuscleWiki exercise id");
    return this.muscleWiki.exercise(exerciseId);
  }

  @Get("musclewiki/media/video/:stream/:filename")
  async muscleWikiVideo(
    @Param("stream") stream: "branded" | "unbranded",
    @Param("filename") filename: string,
    @Req() request: { headers: Record<string, string | string[] | undefined> },
    @Res() response: { status: (status: number) => typeof response; setHeader: (name: string, value: string) => void; end: () => void; },
  ) {
    if (stream !== "branded" && stream !== "unbranded") throw new NotFoundException("Video stream not found");
    const range = typeof request.headers.range === "string" ? request.headers.range : undefined;
    const upstream = await this.muscleWiki.streamVideo(stream, filename, range);
    response.status(upstream.status);
    for (const header of ["content-type", "content-length", "content-range", "accept-ranges"]) {
      const value = upstream.headers.get(header);
      if (value) response.setHeader(header, value);
    }
    // MuscleWiki permits transient playback buffering, not persistent media
    // storage. Apply this even when the upstream omits its cache header.
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    if (!upstream.body) return response.end();
    Readable.fromWeb(upstream.body as never).pipe(response as never);
  }

  @Get("workouts") workouts() { return this.database.workouts(); }
  @Get("workouts/:id") workout(@Param("id") id: string) {
    const workout = this.database.workout(id);
    if (!workout) throw new NotFoundException("Workout not found");
    return workout;
  }
  @Post("workouts") createWorkout(@Body() body: CreateWorkoutDto) { return this.database.add("workouts", body); }

  @Get("sessions") sessions() { return this.database.sessions().slice().reverse(); }
  @Post("sessions") async createSession(@Body() body: CreateSessionDto) {
    const volumeKg = body.sets.reduce((total, set) => total + set.loadKg * set.reps, 0);
    return this.database.add("sessions", { ...body, volumeKg: Math.round(volumeKg), completedSets: body.sets.length });
  }

  @Get("goals") goals() { return this.database.goals(); }
  @Post("goals") createGoal(@Body() body: CreateGoalDto) { return this.database.add("goals", body); }
}
