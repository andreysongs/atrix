import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { DatabaseService } from "./database.service.js";
import { MuscleWikiService } from "./musclewiki.service.js";

@Module({ controllers: [AppController], providers: [DatabaseService, MuscleWikiService] })
export class AppModule {}
