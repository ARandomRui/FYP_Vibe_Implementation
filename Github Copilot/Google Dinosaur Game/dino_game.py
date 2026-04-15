import random
import time
import tkinter as tk


WINDOW_WIDTH = 900
WINDOW_HEIGHT = 320
GROUND_Y = 260

PLAYER_X = 70
PLAYER_STAND_WIDTH = 36
PLAYER_STAND_HEIGHT = 52
PLAYER_DUCK_WIDTH = 52
PLAYER_DUCK_HEIGHT = 34

GRAVITY = 0.95
JUMP_VELOCITY = -16.5
FAST_FALL_GRAVITY_MULTIPLIER = 2.4
FAST_FALL_IMPULSE = 4.2

CACTUS_MIN_GAP = 260
CACTUS_MAX_GAP = 430
BIRD_MIN_GAP = 340
BIRD_MAX_GAP = 560


class DinoGame:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Rectangle Dino Game")
        self.root.resizable(False, False)

        self.canvas = tk.Canvas(
            root,
            width=WINDOW_WIDTH,
            height=WINDOW_HEIGHT,
            bg="#f7f7f7",
            highlightthickness=0,
        )
        self.canvas.pack()

        self.ground_line = self.canvas.create_line(
            0, GROUND_Y, WINDOW_WIDTH, GROUND_Y, fill="#8a8a8a", width=2
        )

        self.player_y = GROUND_Y - PLAYER_STAND_HEIGHT
        self.player_vy = 0.0
        self.is_jumping = False
        self.is_ducking = False
        self.down_pressed = False

        self.player = self.canvas.create_rectangle(
            PLAYER_X,
            self.player_y,
            PLAYER_X + PLAYER_STAND_WIDTH,
            self.player_y + PLAYER_STAND_HEIGHT,
            fill="green",
            outline="",
        )

        self.obstacles: list[dict] = []
        self.next_spawn_distance = 300.0

        self.base_speed = 8.0
        self.speed = self.base_speed
        self.run_time = 0.0
        self.score = 0
        self.displayed_score = -1
        self.best_score = 0
        self.last_update_time = time.perf_counter()

        self.game_over = False

        self.score_text = self.canvas.create_text(
            WINDOW_WIDTH - 20,
            25,
            text="Score: 0   Best: 0",
            anchor="e",
            font=("Consolas", 16, "bold"),
            fill="#444",
        )

        self.info_text = self.canvas.create_text(
            WINDOW_WIDTH // 2,
            60,
            text="SPACE / UP jump, DOWN duck, DOWN in air to dive",
            font=("Consolas", 14),
            fill="#666",
        )

        self.game_over_text = self.canvas.create_text(
            WINDOW_WIDTH // 2,
            WINDOW_HEIGHT // 2 - 10,
            text="",
            font=("Consolas", 24, "bold"),
            fill="#222",
        )
        self.restart_text = self.canvas.create_text(
            WINDOW_WIDTH // 2,
            WINDOW_HEIGHT // 2 + 24,
            text="",
            font=("Consolas", 14),
            fill="#444",
        )

        self.root.bind("<space>", self.on_jump)
        self.root.bind("<Up>", self.on_jump)
        self.root.bind("<KeyPress-Down>", self.on_duck_press)
        self.root.bind("<KeyRelease-Down>", self.on_duck_release)
        self.root.bind("<KeyPress-s>", self.on_duck_press)
        self.root.bind("<KeyRelease-s>", self.on_duck_release)
        self.root.bind("<KeyPress-S>", self.on_duck_press)
        self.root.bind("<KeyRelease-S>", self.on_duck_release)
        self.root.bind("<r>", self.on_restart)
        self.root.bind("<R>", self.on_restart)

        self.update_loop()

    def on_jump(self, _event=None) -> None:
        if self.game_over:
            return
        if not self.is_jumping:
            if self.is_ducking:
                self.is_ducking = False
                self.player_y = GROUND_Y - PLAYER_STAND_HEIGHT
                self.update_player_shape()
            self.player_vy = JUMP_VELOCITY
            self.is_jumping = True

    def on_duck_press(self, _event=None) -> None:
        if self.game_over:
            return
        self.down_pressed = True

        if self.is_jumping:
            # Makes downward input responsive even at jump apex.
            self.player_vy = max(self.player_vy, FAST_FALL_IMPULSE)
            return

        if not self.is_ducking:
            self.is_ducking = True
            self.player_y = GROUND_Y - PLAYER_DUCK_HEIGHT
            self.update_player_shape()

    def on_duck_release(self, _event=None) -> None:
        if self.game_over:
            return
        self.down_pressed = False

        if self.is_jumping:
            return

        if self.is_ducking:
            self.is_ducking = False
            self.player_y = GROUND_Y - PLAYER_STAND_HEIGHT
            self.update_player_shape()

    def on_restart(self, _event=None) -> None:
        if not self.game_over:
            return

        self.game_over = False
        self.score = 0
        self.displayed_score = -1
        self.speed = self.base_speed
        self.run_time = 0.0
        self.last_update_time = time.perf_counter()
        self.next_spawn_distance = 280.0

        for obstacle in self.obstacles:
            self.canvas.delete(obstacle["id"])
        self.obstacles.clear()

        self.player_y = GROUND_Y - PLAYER_STAND_HEIGHT
        self.player_vy = 0
        self.is_jumping = False
        self.is_ducking = False
        self.down_pressed = False
        self.update_player_shape()

        self.canvas.itemconfigure(self.game_over_text, text="")
        self.canvas.itemconfigure(self.restart_text, text="")
        self.canvas.itemconfigure(self.info_text, text="SPACE / UP jump, DOWN duck, DOWN in air to dive")

    def current_player_size(self) -> tuple[int, int]:
        if self.is_ducking and not self.is_jumping:
            return PLAYER_DUCK_WIDTH, PLAYER_DUCK_HEIGHT
        return PLAYER_STAND_WIDTH, PLAYER_STAND_HEIGHT

    def update_player_shape(self) -> None:
        width, height = self.current_player_size()
        self.canvas.coords(
            self.player,
            PLAYER_X,
            self.player_y,
            PLAYER_X + width,
            self.player_y + height,
        )

    def spawn_obstacle(self) -> None:
        kind = "cactus" if random.random() < 0.68 else "bird"

        if kind == "cactus":
            width = random.randint(18, 30)
            height = random.randint(38, 62)
            x1 = WINDOW_WIDTH + 20
            y1 = GROUND_Y - height
            x2 = x1 + width
            y2 = GROUND_Y
            oid = self.canvas.create_rectangle(x1, y1, x2, y2, fill="red", outline="")
            gap = random.randint(CACTUS_MIN_GAP, CACTUS_MAX_GAP)
            self.next_spawn_distance = float(gap)
        else:
            width = 34
            height = 26
            x1 = WINDOW_WIDTH + 20
            # Low birds require jumping, middle birds require duck or jump, high birds are safe to run under.
            y1 = random.choice([GROUND_Y - 30, GROUND_Y - 64, GROUND_Y - 102])
            x2 = x1 + width
            y2 = y1 + height
            oid = self.canvas.create_rectangle(x1, y1, x2, y2, fill="pink", outline="")
            gap = random.randint(BIRD_MIN_GAP, BIRD_MAX_GAP)
            self.next_spawn_distance = float(gap)

        self.obstacles.append({"id": oid, "kind": kind})

    def player_bbox(self) -> tuple[float, float, float, float]:
        return tuple(self.canvas.coords(self.player))

    @staticmethod
    def intersects(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> bool:
        ax1, ay1, ax2, ay2 = a
        bx1, by1, bx2, by2 = b
        return ax1 < bx2 and ax2 > bx1 and ay1 < by2 and ay2 > by1

    def end_game(self) -> None:
        self.game_over = True
        if self.score > self.best_score:
            self.best_score = self.score

        self.canvas.itemconfigure(self.game_over_text, text="GAME OVER")
        self.canvas.itemconfigure(self.restart_text, text="Press R to restart")
        self.canvas.itemconfigure(self.info_text, text="")

    def update_player(self, dt_units: float) -> None:
        if self.is_jumping:
            gravity_mult = FAST_FALL_GRAVITY_MULTIPLIER if self.down_pressed else 1.0
            self.player_vy += GRAVITY * gravity_mult * dt_units
            self.player_y += self.player_vy * dt_units

            floor_y = GROUND_Y - PLAYER_STAND_HEIGHT
            if self.player_y >= floor_y:
                self.is_ducking = self.down_pressed
                if self.is_ducking:
                    self.player_y = GROUND_Y - PLAYER_DUCK_HEIGHT
                else:
                    self.player_y = floor_y
                self.player_vy = 0
                self.is_jumping = False

        self.update_player_shape()

    def update_obstacles(self, dt_units: float) -> None:
        player_box = self.player_bbox()
        move_by = self.speed * dt_units

        to_remove = []
        for obstacle in self.obstacles:
            oid = obstacle["id"]
            self.canvas.move(oid, -move_by, 0)
            x1, y1, x2, y2 = self.canvas.coords(oid)

            if self.intersects(player_box, (x1, y1, x2, y2)):
                self.end_game()
                return

            if x2 < -5:
                to_remove.append(obstacle)

        for obstacle in to_remove:
            self.canvas.delete(obstacle["id"])
            self.obstacles.remove(obstacle)

    def update_score_and_speed(self, dt_seconds: float) -> None:
        self.run_time += dt_seconds
        self.score = int(self.run_time * 10)

        # Gradually increase game speed for progressive difficulty.
        self.speed = self.base_speed + min(8.0, self.run_time / 6.0)

        if self.score > self.best_score:
            self.best_score = self.score

        if self.score != self.displayed_score:
            self.canvas.itemconfigure(
                self.score_text,
                text=f"Score: {self.score}   Best: {self.best_score}",
            )
            self.displayed_score = self.score

    def update_loop(self) -> None:
        now = time.perf_counter()
        dt_seconds = min(0.05, now - self.last_update_time)
        self.last_update_time = now
        dt_units = dt_seconds * 60.0

        if not self.game_over:
            self.update_player(dt_units)
            self.update_obstacles(dt_units)

            if not self.game_over:
                self.next_spawn_distance -= self.speed * dt_units
                if self.next_spawn_distance <= 0:
                    self.spawn_obstacle()

                self.update_score_and_speed(dt_seconds)

        self.root.after(10, self.update_loop)


def main() -> None:
    root = tk.Tk()
    DinoGame(root)
    root.mainloop()


if __name__ == "__main__":
    main()
