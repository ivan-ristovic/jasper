package net.ristovic.tests.correctness.pojo;

public class Supplier {
    private Long supplierId;
    private String supplierName;
    private String contactEmail;

    public Supplier() {}
    public Supplier(Long supplierId, String supplierName, String contactEmail) {
        this.supplierId = supplierId;
        this.supplierName = supplierName;
        this.contactEmail = contactEmail;
    }
    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }
    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }
    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }
}
