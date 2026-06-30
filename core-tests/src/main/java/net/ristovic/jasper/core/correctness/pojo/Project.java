package net.ristovic.jasper.core.correctness.pojo;

public class Project {
    private Long projectId;
    private String projectName;
    private Double budget;

    public Project() {}

    public Project(Long projectId, String projectName, Double budget) {
        this.projectId = projectId;
        this.projectName = projectName;
        this.budget = budget;
    }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }

    public String getProjectName() { return projectName; }
    public void setProjectName(String projectName) { this.projectName = projectName; }

    public Double getBudget() { return budget; }
    public void setBudget(Double budget) { this.budget = budget; }
}
