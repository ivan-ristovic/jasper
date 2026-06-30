package net.ristovic.jasper.micro.sdjmh.data.gen;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Random;

import net.ristovic.jasper.micro.sdjmh.data.model.Client;

public final class ClientGenerator extends DataGenerator<Client> {

    public ClientGenerator(Random rng) {
        super(rng);
    }
    
    @Override
    public void generateFields(Client obj) {
        obj.setId(Math.abs(randLong()));
        obj.setIndex(randInt());
        obj.setIsActive(randBool());
        obj.setBalance(randBigDecimal());
        obj.setPicture(randStr(100));
        obj.setAge(randInt(100));
        obj.setEyeColor(Client.EyeColor.fromNumber(randInt(3)));
        obj.setName(randStr(20));
        obj.setGender(randStr(20));
        obj.setCompany(randStr(20));
        obj.setEmails(randStrArr(randInt(10), 20));
        obj.setPhones(randLongArr(randInt(10)));
        obj.setAddress(randStr(20));
        obj.setAbout(randStr(20));
        obj.setRegistered(LocalDate.of(1900 + randInt(110), 1 + randInt(12), 1 + randInt(28)));
        obj.setLatitude(randDouble(90));
        obj.setLongitude(randDouble(180));
        obj.setTags(new ArrayList<>());
        int tagCount = randInt(50);
        for (int i = 0; i < tagCount; i++) {
            obj.getTags().add(randStr(10));
        }
        int partnerCount = randInt(30);
        obj.setPartners(new ArrayList<>());
        for (int i = 0; i < partnerCount; i++) {
            long id = randLong();
            String name = randStr(30);
            OffsetDateTime at = OffsetDateTime.of(
                1925 + randInt(100),
                1 + randInt(12),
                1 + randInt(28),
                randInt(24),
                randInt(60),
                randInt(60),
                randInt(1000000000),
                ZoneOffset.UTC
            );
            obj.getPartners().add(new Client.Partner(id, name, at));
        }
    }
}
