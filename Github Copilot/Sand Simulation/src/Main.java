import javax.swing.*;
import java.awt.*;
import java.awt.event.*;

public class Main {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame frame = new JFrame("Falling Sand Simulator");
            SandSimPanel simPanel = new SandSimPanel();
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            frame.setLayout(new BorderLayout());
            frame.add(simPanel, BorderLayout.CENTER);

            JPanel controls = new JPanel();
            JButton sandBtn = new JButton("Sand");
            JButton waterBtn = new JButton("Water");
            JButton wallBtn = new JButton("Wall");
            JButton clearBtn = new JButton("Clear");
            sandBtn.addActionListener(e -> simPanel.setDrawType(ParticleType.SAND));
            waterBtn.addActionListener(e -> simPanel.setDrawType(ParticleType.WATER));
            wallBtn.addActionListener(e -> simPanel.setDrawType(ParticleType.WALL));
            clearBtn.addActionListener(e -> simPanel.clearGrid());
            controls.add(sandBtn);
            controls.add(waterBtn);
            controls.add(wallBtn);
            controls.add(clearBtn);
            frame.add(controls, BorderLayout.SOUTH);

            frame.pack();
            frame.setLocationRelativeTo(null);
            frame.setVisible(true);
        });
    }
}
