package net.ristovic.tests.correctness;

import java.io.*;
import java.lang.reflect.*;
import java.math.*;
import java.nio.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.regex.*;

import net.ristovic.tests.correctness.pojo.*;

final class WorkloadCollection {

    private Set<Class<?>> c = new HashSet<>();
    private List<Object> w = new ArrayList<>();

    WorkloadCollection() {
        init();
    }

    public List<Object> all() {
        return w;
    }

    public void register(Serializer s) throws Exception {
        Class<?>[] types = (Class<?>[]) c.toArray(new Class<?>[0]);
        s.register(types);
    }

    private void put(Class<?> clazz, Object obj) {
        c.add(clazz);
        w.add(obj);
    }

    private void init() {

        // Basic tests
        put(Boolean.class, true);
        put(Integer.class, 42);
        put(Double.class, 42.0);
        put(Float.class, 42.0);
        put(Character.class, 'C');
        put(Byte.class, (byte) 42);
        put(String.class, "Hello");

        // Wrapper-objects
        put(Data.Box.class, new Data.Box(42));
        put(Data.Box2.class, new Data.Box2(42, "Hello"));
        put(Data.Box3.class, new Data.Box3(42, "Hello", true));
        put(Data.MapIntStr.class, new Data.MapIntStr(16));
        put(Data.MapStrStr.class, new Data.MapStrStr(16));
        put(Data.MapBox2Box3.class, new Data.MapBox2Box3(16));
        
        // Explicit reference cycles
        put(Data.Cycle.class, new Data.Cycle());

        // POJOs
        put(User.class, new User(1L, "john_doe", "john@example.com"));
        put(Product.class, new Product(100L, "Laptop", 1199.99));
        put(Order.class, new Order(5000L, 1L, "Processing"));
        put(Address.class, new Address("123 Main St", "New York", "USA"));
        put(Invoice.class, new Invoice(3000L, 2500.00, "2024-07-01"));
        put(Department.class, new Department(10L, "Engineering"));
        put(Employee.class, new Employee(220L, "Alice Smith", "Developer"));
        put(Category.class, new Category(15L, "Electronics"));
        put(Review.class, new Review(808L, 100L, "Great product!"));
        put(Supplier.class, new Supplier(44L, "ABC Supplies", "contact@abc.com"));
        put(Customer.class, new Customer(101L, "Jane Doe", "555-1234"));
        put(Project.class, new Project(201L, "Apollo", 500000.00));
        put(Task.class, new Task(301L, "Design UI", false));
        put(Meeting.class, new Meeting(401L, "Kickoff", OffsetDateTime.now()));
        put(Document.class, new Document(501L, "Project Plan", "PDF"));
        put(Notification.class, new Notification(601L, "Welcome!", false));

        // Numbers
        put(BigDecimal.class, new BigDecimal("100000.010000010"));
        put(BigInteger.class, new BigInteger("1000000000000"));

        // String utils
        put(StringBuffer.class, new StringBuffer("buffer"));
        put(StringBuilder.class, new StringBuilder("buffer"));

        // Files
        put(File.class, new File("."));
        put(Path.class, Path.of("foo"));

        // Time
        put(DayOfWeek.class, DayOfWeek.MONDAY);
        put(Month.class, Month.JANUARY);
        put(Duration.class, Duration.ZERO);
        put(Instant.class, Instant.now());
        put(LocalDate.class, LocalDate.now());
        put(LocalTime.class, LocalTime.now());
        put(LocalDateTime.class, LocalDateTime.now());
        put(MonthDay.class, MonthDay.now());
        put(Year.class, Year.now());
        put(YearMonth.class, YearMonth.now());
        put(OffsetTime.class, OffsetTime.now());
        put(OffsetDateTime.class, OffsetDateTime.now());
        put(Period.class, Period.ofDays(1));
        put(ZonedDateTime.class, ZonedDateTime.now());
        put(GregorianCalendar.class, new GregorianCalendar());

        // Regex
        put(Pattern.class, Pattern.compile("foobar+"));
        put(Matcher.class, Pattern.compile("foobar+").matcher("foobarrr"));

        // Collections
        put(ArrayList.class, new ArrayList<Object>());
        put(LinkedList.class, new LinkedList<Object>());
        put(HashMap.class, new HashMap<Object, Object>());
        put(TreeMap.class, new TreeMap<Object, Object>());
        put(HashSet.class, new HashSet<Object>());
        put(TreeSet.class, new TreeSet<Object>());
        put(Vector.class, new Vector<Object>());
        put(Stack.class, new Stack<Object>());
        put(Enumeration.class, Collections.emptyEnumeration());
        put(Iterator.class, Collections.emptyIterator());
        put(List.class, Collections.emptyList());
        put(ListIterator.class, Collections.emptyListIterator());
        put(Map.class, Collections.emptyMap());
        put(NavigableMap.class, Collections.emptyNavigableMap());
        put(NavigableSet.class, Collections.emptyNavigableSet());
        put(Set.class, Collections.emptySet());
        put(SortedMap.class, Collections.emptySortedMap());
        put(SortedSet.class, Collections.emptySortedSet());
        put(Collection.class, Collections.synchronizedCollection(Collections.emptyList()));
        put(List.class, Collections.synchronizedList(Collections.emptyList()));
        put(Map.class, Collections.synchronizedMap(Collections.emptyMap()));
        put(NavigableMap.class, Collections.synchronizedNavigableMap(Collections.emptyNavigableMap()));
        put(NavigableSet.class, Collections.synchronizedNavigableSet(Collections.emptyNavigableSet()));
        put(Set.class, Collections.synchronizedSet(Collections.emptySet()));
        put(SortedMap.class, Collections.synchronizedSortedMap(Collections.emptySortedMap()));
        put(SortedSet.class, Collections.synchronizedSortedSet(Collections.emptySortedSet()));
        put(Collection.class, Collections.unmodifiableCollection(Collections.emptyList()));
        put(List.class, Collections.unmodifiableList(Collections.emptyList()));
        put(Map.class, Collections.unmodifiableMap(Collections.emptyMap()));
        put(NavigableMap.class, Collections.unmodifiableNavigableMap(Collections.emptyNavigableMap()));
        put(NavigableSet.class, Collections.unmodifiableNavigableSet(Collections.emptyNavigableSet()));
        put(Set.class, Collections.unmodifiableSet(Collections.emptySet()));
        put(SortedMap.class, Collections.unmodifiableSortedMap(Collections.emptySortedMap()));
        put(SortedSet.class, Collections.unmodifiableSortedSet(Collections.emptySortedSet()));

        // Reflection
        try {
            Class<?> c = this.getClass();
            put(Field.class, c.getDeclaredField("w"));
            put(Method.class, c.getDeclaredMethod("init"));
            put(Constructor.class, c.getDeclaredConstructor());
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

}
