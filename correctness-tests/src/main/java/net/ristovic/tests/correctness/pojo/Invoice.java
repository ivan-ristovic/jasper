package net.ristovic.tests.correctness.pojo;

public class Invoice {
    private Long invoiceId;
    private double amount;
    private String dueDate;

    public Invoice() {}
    public Invoice(Long invoiceId, double amount, String dueDate) {
        this.invoiceId = invoiceId;
        this.amount = amount;
        this.dueDate = dueDate;
    }
    public Long getInvoiceId() { return invoiceId; }
    public void setInvoiceId(Long invoiceId) { this.invoiceId = invoiceId; }
    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }
    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }
}
