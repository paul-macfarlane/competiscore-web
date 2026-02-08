"use client";

import { SimpleIconSelector } from "@/components/icon-selector";
import { MarkdownInput } from "@/components/markdown-input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  GAME_CATEGORY_LABELS,
  GAME_ICON_OPTIONS,
  GameCategory,
  ParticipantType,
  ScoreOrder,
  ScoringType,
} from "@/lib/shared/constants";
import {
  FFAConfig,
  GAME_TEMPLATES,
  GameTemplate,
  H2HConfig,
  HighScoreConfig,
} from "@/lib/shared/game-templates";
import {
  GAME_TYPE_DESCRIPTION_MAX_LENGTH,
  GAME_TYPE_NAME_MAX_LENGTH,
  RULES_MAX_LENGTH,
} from "@/services/constants";
import {
  CreateGameTypeFormValues,
  createGameTypeFormSchema,
} from "@/validators/game-types";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createGameTypeAction } from "../actions";

const TEMPLATE_LIST = Object.entries(GAME_TEMPLATES).map(([key, template]) => ({
  key,
  ...template,
}));

type CreateGameTypeFormProps = {
  leagueId: string;
};

export function CreateGameTypeForm({ leagueId }: CreateGameTypeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const form = useForm<CreateGameTypeFormValues>({
    resolver: zodResolver(createGameTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      logo: undefined,
      category: GameCategory.HEAD_TO_HEAD,
      config: {
        scoringType: ScoringType.WIN_LOSS,
        drawsAllowed: false,
        minPlayersPerSide: 1,
        maxPlayersPerSide: 1,
      },
      leagueId,
    },
    mode: "onChange",
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const category = form.watch("category");

  const applyTemplate = (template: GameTemplate, key: string) => {
    setSelectedTemplate(key);
    form.setValue("name", template.name);
    form.setValue("description", template.description);
    form.setValue("logo", template.logo);
    form.setValue("category", template.category);

    if (template.category === GameCategory.HEAD_TO_HEAD) {
      const config = template.config as H2HConfig;
      form.setValue("config", {
        scoringType: config.scoringType as
          | typeof ScoringType.WIN_LOSS
          | typeof ScoringType.SCORE_BASED,
        scoreDescription: config.scoreDescription,
        drawsAllowed: config.drawsAllowed,
        minPlayersPerSide: config.minPlayersPerSide,
        maxPlayersPerSide: config.maxPlayersPerSide,
        rules: config.rules,
      });
    } else if (template.category === GameCategory.FREE_FOR_ALL) {
      const config = template.config as FFAConfig;
      form.setValue("config", {
        scoringType: config.scoringType as
          | typeof ScoringType.RANKED_FINISH
          | typeof ScoringType.SCORE_BASED,
        scoreOrder: config.scoreOrder as
          | typeof ScoreOrder.HIGHEST_WINS
          | typeof ScoreOrder.LOWEST_WINS,
        minPlayers: config.minPlayers,
        maxPlayers: config.maxPlayers,
        rules: config.rules,
      });
    } else if (template.category === GameCategory.HIGH_SCORE) {
      const config = template.config as HighScoreConfig;
      form.setValue("config", {
        scoreOrder: config.scoreOrder as
          | typeof ScoreOrder.HIGHEST_WINS
          | typeof ScoreOrder.LOWEST_WINS,
        scoreDescription: config.scoreDescription,
        participantType: config.participantType as
          | typeof ParticipantType.INDIVIDUAL
          | typeof ParticipantType.TEAM,
        rules: config.rules,
      });
    }
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
    form.reset();
  };

  const onSubmit = (values: CreateGameTypeFormValues) => {
    startTransition(async () => {
      const result = await createGameTypeAction(values);
      if (result.error) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof CreateGameTypeFormValues, { message });
          });
        } else {
          toast.error(result.error);
        }
      } else if (result.data) {
        toast.success("Game type created successfully!");
        router.push(`/leagues/${leagueId}/game-types/${result.data.id}`);
      }
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 rounded-lg border p-4 md:p-6"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Start from a Template</h3>
              <p className="text-sm text-muted-foreground">
                Choose a pre-configured game or create a custom one
              </p>
            </div>
            {selectedTemplate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearTemplate}
              >
                Clear
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {TEMPLATE_LIST.map((template) => (
              <button
                key={template.key}
                type="button"
                onClick={() => applyTemplate(template, template.key)}
                className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors hover:bg-muted ${
                  selectedTemplate === template.key
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                {template.logo && (
                  <div className="relative h-10 w-10">
                    <Image
                      src={template.logo}
                      alt={template.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
                <span className="text-xs font-medium">{template.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {selectedTemplate ? "Customize below" : "Or create custom"}
            </span>
          </div>
        </div>

        <input value={leagueId} type="hidden" {...form.register("leagueId")} />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Game Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ping Pong"
                  maxLength={GAME_TYPE_NAME_MAX_LENGTH}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the game..."
                  maxLength={GAME_TYPE_DESCRIPTION_MAX_LENGTH}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icon (Optional)</FormLabel>
              <div className="flex items-center gap-3">
                {field.value ? (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={field.value}
                      alt="Game icon"
                      fill
                      className="object-cover p-1"
                    />
                  </div>
                ) : (
                  <div className="bg-muted flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border">
                    <span className="text-muted-foreground text-xs">
                      No icon
                    </span>
                  </div>
                )}
                <SimpleIconSelector
                  options={GAME_ICON_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  trigger={
                    <Button variant="outline" type="button" size="sm">
                      {field.value ? "Change Icon" : "Select Icon"}
                    </Button>
                  }
                  title="Select a Game Icon"
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Game Category</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (value === GameCategory.HEAD_TO_HEAD) {
                      form.setValue("config", {
                        scoringType: ScoringType.WIN_LOSS,
                        drawsAllowed: false,
                        minPlayersPerSide: 1,
                        maxPlayersPerSide: 1,
                      });
                    } else if (value === GameCategory.FREE_FOR_ALL) {
                      form.setValue("config", {
                        scoringType: ScoringType.RANKED_FINISH,
                        scoreOrder: ScoreOrder.HIGHEST_WINS,
                        minPlayers: 2,
                        maxPlayers: 10,
                      });
                    } else if (value === GameCategory.HIGH_SCORE) {
                      form.setValue("config", {
                        scoreOrder: ScoreOrder.HIGHEST_WINS,
                        scoreDescription: "Points",
                        participantType: ParticipantType.INDIVIDUAL,
                      });
                    }
                  }}
                  value={field.value}
                  className="grid gap-3"
                >
                  {Object.entries(GAME_CATEGORY_LABELS).map(
                    ([value, label]) => (
                      <div
                        key={value}
                        className="flex items-center space-x-2 rounded-lg border p-3"
                      >
                        <RadioGroupItem value={value} id={value} />
                        <Label
                          htmlFor={value}
                          className="flex-1 cursor-pointer"
                        >
                          {label}
                        </Label>
                      </div>
                    ),
                  )}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {category === GameCategory.HEAD_TO_HEAD && (
          <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
            <h3 className="font-medium">Head-to-Head Configuration</h3>

            <FormField
              control={form.control}
              name="config.scoringType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scoring Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={ScoringType.WIN_LOSS}
                          id="win_loss"
                        />
                        <Label htmlFor="win_loss" className="cursor-pointer">
                          Win/Loss Only
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={ScoringType.SCORE_BASED}
                          id="score_based"
                        />
                        <Label htmlFor="score_based" className="cursor-pointer">
                          Score-Based
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("config.scoringType") === ScoringType.SCORE_BASED && (
              <FormField
                control={form.control}
                name="config.scoreDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score Label</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Points, Goals, Games, etc."
                        maxLength={50}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="config.drawsAllowed"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4"
                    />
                  </FormControl>
                  <FormLabel className="mt-0!">Allow Draws</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="config.minPlayersPerSide"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Players Per Side</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 1)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="config.maxPlayersPerSide"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Players Per Side</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 1)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="config.rules"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rules (Optional)</FormLabel>
                  <FormControl>
                    <MarkdownInput
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Enter rules in markdown format..."
                      maxLength={RULES_MAX_LENGTH}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {category === GameCategory.FREE_FOR_ALL && (
          <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
            <h3 className="font-medium">Free-for-All Configuration</h3>

            <FormField
              control={form.control}
              name="config.scoringType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scoring Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={ScoringType.RANKED_FINISH}
                          id="ranked_finish"
                        />
                        <Label
                          htmlFor="ranked_finish"
                          className="cursor-pointer"
                        >
                          Ranked Finish (1st, 2nd, 3rd...)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={ScoringType.SCORE_BASED}
                          id="score_based_ffa"
                        />
                        <Label
                          htmlFor="score_based_ffa"
                          className="cursor-pointer"
                        >
                          Score-Based Ranking
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="config.scoreOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Score Order</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={ScoreOrder.HIGHEST_WINS}
                          id="highest_wins"
                        />
                        <Label
                          htmlFor="highest_wins"
                          className="cursor-pointer"
                        >
                          Highest Score Wins
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={ScoreOrder.LOWEST_WINS}
                          id="lowest_wins"
                        />
                        <Label htmlFor="lowest_wins" className="cursor-pointer">
                          Lowest Score Wins
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="config.minPlayers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Players</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2}
                        max={50}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 2)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="config.maxPlayers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Players</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2}
                        max={50}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 2)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="config.rules"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rules (Optional)</FormLabel>
                  <FormControl>
                    <MarkdownInput
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Enter rules in markdown format..."
                      maxLength={RULES_MAX_LENGTH}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {category === GameCategory.HIGH_SCORE && (
          <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
            <h3 className="font-medium">High Score Configuration</h3>

            <FormField
              control={form.control}
              name="config.scoreOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Score Order</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={ScoreOrder.HIGHEST_WINS}
                          id="highest_wins_hs"
                        />
                        <Label
                          htmlFor="highest_wins_hs"
                          className="cursor-pointer"
                        >
                          Highest Score Wins
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={ScoreOrder.LOWEST_WINS}
                          id="lowest_wins_hs"
                        />
                        <Label
                          htmlFor="lowest_wins_hs"
                          className="cursor-pointer"
                        >
                          Lowest Score Wins
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="config.scoreDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Score Label</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Points, Time, Distance, etc."
                      maxLength={50}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="config.participantType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Participant Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={ParticipantType.INDIVIDUAL}
                          id="individual"
                        />
                        <Label htmlFor="individual" className="cursor-pointer">
                          Individual
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={ParticipantType.TEAM}
                          id="team"
                        />
                        <Label htmlFor="team" className="cursor-pointer">
                          Team
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="config.rules"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rules (Optional)</FormLabel>
                  <FormControl>
                    <MarkdownInput
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Enter rules in markdown format..."
                      maxLength={RULES_MAX_LENGTH}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? "Creating..." : "Create Game Type"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
