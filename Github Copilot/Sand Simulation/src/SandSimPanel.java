import javax.swing.*;
import java.awt.*;
import java.awt.event.*;

public class SandSimPanel extends JPanel implements MouseListener, MouseMotionListener {
    private static final int CELL_SIZE = 4;
    private static final int WIDTH = 200;
    private static final int HEIGHT = 150;
    private ParticleType[][] grid = new ParticleType[WIDTH][HEIGHT];
    private ParticleType drawType = ParticleType.SAND;

    public SandSimPanel() {
        setPreferredSize(new Dimension(WIDTH * CELL_SIZE, HEIGHT * CELL_SIZE));
        addMouseListener(this);
        addMouseMotionListener(this);
        clearGrid();
        Timer timer = new Timer(16, e -> step());
        timer.start();
    }

    public void clearGrid() {
        for (int x = 0; x < WIDTH; x++) {
            for (int y = 0; y < HEIGHT; y++) {
                grid[x][y] = ParticleType.EMPTY;
            }
        }
        repaint();
    }

    private void step() {
        for (int y = HEIGHT - 2; y >= 0; y--) {
            for (int x = 1; x < WIDTH - 1; x++) {
                if (grid[x][y] == ParticleType.SAND) {
                    // Sand falls vertically if possible, then diagonally, but not into walls
                    if (grid[x][y + 1] == ParticleType.EMPTY) {
                        grid[x][y + 1] = ParticleType.SAND;
                        grid[x][y] = ParticleType.EMPTY;
                    } else if (grid[x][y + 1] == ParticleType.WATER) {
                        // Sand sinks below water
                        grid[x][y + 1] = ParticleType.SAND;
                        grid[x][y] = ParticleType.WATER;
                    } else if (grid[x][y + 1] != ParticleType.WALL) {
                        if (grid[x - 1][y + 1] == ParticleType.EMPTY) {
                            grid[x - 1][y + 1] = ParticleType.SAND;
                            grid[x][y] = ParticleType.EMPTY;
                        } else if (grid[x + 1][y + 1] == ParticleType.EMPTY) {
                            grid[x + 1][y + 1] = ParticleType.SAND;
                            grid[x][y] = ParticleType.EMPTY;
                        } else if (grid[x - 1][y + 1] == ParticleType.WATER) {
                            // Sand sinks diagonally left ONLY if cell is water
                            grid[x - 1][y + 1] = ParticleType.SAND;
                            grid[x][y] = ParticleType.WATER;
                        } else if (grid[x + 1][y + 1] == ParticleType.WATER) {
                            // Sand sinks diagonally right ONLY if cell is water
                            grid[x + 1][y + 1] = ParticleType.SAND;
                            grid[x][y] = ParticleType.WATER;
                        }
                    }
                }
                else if (grid[x][y] == ParticleType.WATER) {
                    // Water falls vertically, then spreads horizontally to equalize level
                    boolean moved = false;
                    // Try vertical
                    if (grid[x][y + 1] == ParticleType.EMPTY) {
                        grid[x][y + 1] = ParticleType.WATER;
                        grid[x][y] = ParticleType.EMPTY;
                        moved = true;
                    } else if (grid[x][y + 1] != ParticleType.WALL && grid[x][y + 1] != ParticleType.SAND) {
                        // Try to spread horizontally to equalize level, but do not cross walls
                        int spreadDist = 8; // how far water can spread
                        // Randomize left or right spread
                        boolean tryLeftFirst = Math.random() < 0.5;
                        if (tryLeftFirst) {
                            for (int d = 1; d <= spreadDist; d++) {
                                // Left
                                int lx = x - d;
                                if (lx < 0 || grid[lx][y] == ParticleType.WALL || grid[lx][y + 1] == ParticleType.WALL) break;
                                if ((grid[lx][y] == ParticleType.EMPTY && grid[lx][y + 1] == ParticleType.EMPTY) ||
                                    (grid[lx][y] == ParticleType.WATER && grid[lx][y + 1] == ParticleType.WATER)) {
                                    // Swap with water or move to empty
                                    ParticleType temp = grid[lx][y];
                                    grid[lx][y] = ParticleType.WATER;
                                    grid[x][y] = temp;
                                    moved = true;
                                    break;
                                }
                            }
                            if (!moved) {
                                for (int d = 1; d <= spreadDist; d++) {
                                    // Right
                                    int rx = x + d;
                                    if (rx >= WIDTH || grid[rx][y] == ParticleType.WALL || grid[rx][y + 1] == ParticleType.WALL) break;
                                    if ((grid[rx][y] == ParticleType.EMPTY && grid[rx][y + 1] == ParticleType.EMPTY) ||
                                        (grid[rx][y] == ParticleType.WATER && grid[rx][y + 1] == ParticleType.WATER)) {
                                        ParticleType temp = grid[rx][y];
                                        grid[rx][y] = ParticleType.WATER;
                                        grid[x][y] = temp;
                                        moved = true;
                                        break;
                                    }
                                }
                            }
                        } else {
                            for (int d = 1; d <= spreadDist; d++) {
                                // Right
                                int rx = x + d;
                                if (rx >= WIDTH || grid[rx][y] == ParticleType.WALL || grid[rx][y + 1] == ParticleType.WALL) break;
                                if ((grid[rx][y] == ParticleType.EMPTY && grid[rx][y + 1] == ParticleType.EMPTY) ||
                                    (grid[rx][y] == ParticleType.WATER && grid[rx][y + 1] == ParticleType.WATER)) {
                                    ParticleType temp = grid[rx][y];
                                    grid[rx][y] = ParticleType.WATER;
                                    grid[x][y] = temp;
                                    moved = true;
                                    break;
                                }
                            }
                            if (!moved) {
                                for (int d = 1; d <= spreadDist; d++) {
                                    // Left
                                    int lx = x - d;
                                    if (lx < 0 || grid[lx][y] == ParticleType.WALL || grid[lx][y + 1] == ParticleType.WALL) break;
                                    if ((grid[lx][y] == ParticleType.EMPTY && grid[lx][y + 1] == ParticleType.EMPTY) ||
                                        (grid[lx][y] == ParticleType.WATER && grid[lx][y + 1] == ParticleType.WATER)) {
                                        ParticleType temp = grid[lx][y];
                                        grid[lx][y] = ParticleType.WATER;
                                        grid[x][y] = temp;
                                        moved = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    // Try sideways if not moved, but do not move into walls
                    if (!moved) {
                        int[] side = {-1, 1};
                        for (int d : side) {
                            int nx = x + d;
                            if (nx >= 0 && nx < WIDTH && grid[nx][y] == ParticleType.EMPTY && grid[nx][y] != ParticleType.WALL) {
                                grid[nx][y] = ParticleType.WATER;
                                grid[x][y] = ParticleType.EMPTY;
                                break;
                            }
                        }
                    }
                }
            }
        }
        repaint();
    }
    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        for (int x = 0; x < WIDTH; x++) {
            for (int y = 0; y < HEIGHT; y++) {
                switch (grid[x][y]) {
                    case SAND:
                        g.setColor(new Color(194, 178, 128));
                        break;
                    case WATER:
                        g.setColor(new Color(64, 164, 223));
                        break;
                    case WALL:
                        g.setColor(Color.DARK_GRAY);
                        break;
                    default:
                        g.setColor(Color.BLACK);
                }
                g.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }

    private void drawParticle(int x, int y) {
        int gx = x / CELL_SIZE;
        int gy = y / CELL_SIZE;
        if (gx >= 0 && gx < WIDTH && gy >= 0 && gy < HEIGHT) {
            grid[gx][gy] = drawType;
        }
    }

    @Override
    public void mousePressed(MouseEvent e) {
        drawParticle(e.getX(), e.getY());
    }

    @Override
    public void mouseDragged(MouseEvent e) {
        drawParticle(e.getX(), e.getY());
    }

    @Override
    public void mouseReleased(MouseEvent e) {}
    @Override
    public void mouseClicked(MouseEvent e) {}
    @Override
    public void mouseEntered(MouseEvent e) {}
    @Override
    public void mouseExited(MouseEvent e) {}
    @Override
    public void mouseMoved(MouseEvent e) {}

    public void setDrawType(ParticleType type) {
        this.drawType = type;
    }
}
