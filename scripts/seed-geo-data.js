const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const prisma = new PrismaClient();

// Function to parse CSV files WITHOUT headers
function parseCSVWithoutHeaders(filePath, columnNames) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv({
                headers: columnNames, // Use provided column names
                skipLines: 0          // Don't skip any lines
            }))
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

// Reset the database - delete all geographic data
async function resetDatabase() {
    console.log('Resetting database...');

    // Delete in correct order to respect foreign key constraints
    // Delete wards first (depends on LLGs)
    await prisma.ward.deleteMany({});
    console.log('- Wards deleted');

    // Delete LLGs (depends on districts)
    await prisma.lLG.deleteMany({});
    console.log('- LLGs deleted');

    // Delete districts (depends on provinces)
    await prisma.district.deleteMany({});
    console.log('- Districts deleted');

    // Delete provinces (depends on geoRegions)
    await prisma.province.deleteMany({});
    console.log('- Provinces deleted');

    // Delete ABG constituencies (depends on ABG districts)
    await prisma.constituency.deleteMany({});
    console.log('- ABG constituencies deleted');

    // Delete ABG districts (depends on regions)
    await prisma.abgDistrict.deleteMany({});
    console.log('- ABG districts deleted');

    // Delete ABG regions (depends on geoRegions)
    await prisma.region.deleteMany({});
    console.log('- ABG regions deleted');

    // Delete MKA wards (depends on MKA regions)
    await prisma.mkaWard.deleteMany({});
    console.log('- MKA wards deleted');

    // Delete MKA regions (depends on geoRegions)
    await prisma.mkaRegion.deleteMany({});
    console.log('- MKA regions deleted');

    // Delete geoRegions last
    await prisma.geoRegion.deleteMany({});
    console.log('- Geo regions deleted');

    console.log('Database reset complete');
}

// Create top-level geo regions (PNG, ABG, MKA)
async function createGeoRegions() {
    const regions = [
        { name: 'PNG', type: 'National' },
        { name: 'ABG', type: 'Autonomous Region' },
        { name: 'MKA', type: 'Assembly' }
    ];

    console.log('Creating geo regions...');

    for (const region of regions) {
        await prisma.geoRegion.upsert({
            where: { name: region.name },
            update: region,
            create: region
        });
    }

    console.log('Geo regions created successfully');
}

// Seed PNG provinces, districts, LLGs, and wards
async function seedPNGData() {
    // Get PNG geo region
    const pngRegion = await prisma.geoRegion.findUnique({
        where: { name: 'PNG' }
    });

    if (!pngRegion) throw new Error('PNG region not found');

    // Define column names for CSV parsing
    const provinceColumns = ['id', 'name'];
    const districtColumns = ['id', 'provinceId', 'name'];
    const llgColumns = ['id', 'districtId', 'name'];
    const wardColumns = ['id', 'llgId', 'name'];

    // Parse CSV files WITHOUT headers
    console.log('Parsing PNG provinces CSV...');
    const provincesData = await parseCSVWithoutHeaders(
        path.join(__dirname, '../data/pngProvinces.csv'),
        provinceColumns
    );

    console.log('Parsing PNG districts CSV...');
    const districtsData = await parseCSVWithoutHeaders(
        path.join(__dirname, '../data/pngDistricts.csv'),
        districtColumns
    );

    console.log('Parsing PNG LLGs CSV...');
    const llgsData = await parseCSVWithoutHeaders(
        path.join(__dirname, '../data/pngLLGs.csv'),
        llgColumns
    );

    console.log('Parsing PNG wards CSV...');
    const wardsData = await parseCSVWithoutHeaders(
        path.join(__dirname, '../data/pngWards.csv'),
        wardColumns
    );

    // Create provinces
    console.log('Creating PNG provinces...');
    for (const province of provincesData) {
        await prisma.province.upsert({
            where: {
                name_geoRegionId: {
                    name: province.name,
                    geoRegionId: pngRegion.id
                }
            },
            update: {
                name: province.name
            },
            create: {
                name: province.name,
                geoRegionId: pngRegion.id
            }
        });
    }

    // Get all provinces
    const provinces = await prisma.province.findMany({
        where: { geoRegionId: pngRegion.id }
    });

    // Create districts
    console.log('Creating PNG districts...');
    for (const district of districtsData) {
        // Find province by ID from CSV
        const provinceFromCSV = provincesData.find(p => p.id === district.provinceId);

        if (provinceFromCSV) {
            const province = provinces.find(p => p.name === provinceFromCSV.name);

            if (province) {
                await prisma.district.upsert({
                    where: {
                        name_provinceId: {
                            name: district.name,
                            provinceId: province.id
                        }
                    },
                    update: {
                        name: district.name
                    },
                    create: {
                        name: district.name,
                        provinceId: province.id
                    }
                });
            }
        }
    }

    // Get all districts
    const districts = await prisma.district.findMany({
        include: {
            province: true
        }
    });

    // Create LLGs
    console.log('Creating PNG LLGs...');
    for (const llg of llgsData) {
        // Find district by ID from CSV
        const districtFromCSV = districtsData.find(d => d.id === llg.districtId);

        if (districtFromCSV) {
            const district = districts.find(d => d.name === districtFromCSV.name);

            if (district) {
                await prisma.lLG.upsert({
                    where: {
                        name_districtId: {
                            name: llg.name,
                            districtId: district.id
                        }
                    },
                    update: {
                        name: llg.name
                    },
                    create: {
                        name: llg.name,
                        districtId: district.id
                    }
                });
            }
        }
    }

    // Get all LLGs
    const llgs = await prisma.lLG.findMany({
        include: {
            district: true
        }
    });

    // Create wards
    console.log('Creating PNG wards...');
    for (const ward of wardsData) {
        // Find LLG by ID from CSV
        const llgFromCSV = llgsData.find(l => l.id === ward.llgId);

        if (llgFromCSV) {
            const llg = llgs.find(l => l.name === llgFromCSV.name);

            if (llg) {
                await prisma.ward.upsert({
                    where: {
                        name_llgId: {
                            name: ward.name,
                            llgId: llg.id
                        }
                    },
                    update: {
                        name: ward.name
                    },
                    create: {
                        name: ward.name,
                        llgId: llg.id,
                        villages: []
                    }
                });
            }
        }
    }

    console.log('PNG data seeded successfully');
}

// Seed ABG data
async function seedABGData() {
    // Get ABG geo region
    const abgRegion = await prisma.geoRegion.findUnique({
        where: { name: 'ABG' }
    });

    if (!abgRegion) throw new Error('ABG region not found');

    // Create ABG regions
    console.log('Creating ABG regions...');
    const abgRegions = [
        { name: 'North', geoRegionId: abgRegion.id },
        { name: 'Central', geoRegionId: abgRegion.id },
        { name: 'South', geoRegionId: abgRegion.id }
    ];

    for (const region of abgRegions) {
        await prisma.region.upsert({
            where: {
                name_geoRegionId: {
                    name: region.name,
                    geoRegionId: abgRegion.id
                }
            },
            update: region,
            create: region
        });
    }

    // Get all regions
    const regions = await prisma.region.findMany({
        where: { geoRegionId: abgRegion.id }
    });

    // Create ABG districts
    console.log('Creating ABG districts...');
    const abgDistricts = [
        { name: 'Buka', regionId: regions.find(r => r.name === 'North').id },
        { name: 'Selau/Suir', regionId: regions.find(r => r.name === 'North').id },
        { name: 'Tinputz', regionId: regions.find(r => r.name === 'North').id },
        { name: 'Teua/Kunua', regionId: regions.find(r => r.name === 'North').id },
        { name: 'Wakunai', regionId: regions.find(r => r.name === 'Central').id },
        { name: 'Kieta', regionId: regions.find(r => r.name === 'Central').id },
        { name: 'Panguna', regionId: regions.find(r => r.name === 'Central').id },
        { name: 'Buin', regionId: regions.find(r => r.name === 'South').id },
        { name: 'Siwai', regionId: regions.find(r => r.name === 'South').id },
        { name: 'Bana', regionId: regions.find(r => r.name === 'South').id },
        { name: 'Torokina', regionId: regions.find(r => r.name === 'South').id }
    ];

    for (const district of abgDistricts) {
        await prisma.abgDistrict.upsert({
            where: {
                name_regionId: {
                    name: district.name,
                    regionId: district.regionId
                }
            },
            update: district,
            create: district
        });
    }

    // Get all districts
    const districts = await prisma.abgDistrict.findMany({
        include: {
            region: true
        }
    });

    // Create ABG constituencies (simplified)
    console.log('Creating ABG constituencies...');
    for (const district of districts) {
        // Create a few sample constituencies for each district
        const constituencyNames = [
            `${district.name} North`,
            `${district.name} South`,
            `${district.name} Central`
        ];

        for (const name of constituencyNames) {
            await prisma.constituency.upsert({
                where: {
                    name_districtId: {
                        name: name,
                        districtId: district.id
                    }
                },
                update: {
                    name: name
                },
                create: {
                    name: name,
                    districtId: district.id,
                    villages: [] // Empty array of villages for now
                }
            });
        }
    }

    console.log('ABG data seeded successfully');
}

// Seed MKA data
async function seedMKAData() {
    // Get MKA geo region
    const mkaRegion = await prisma.geoRegion.findUnique({
        where: { name: 'MKA' }
    });

    if (!mkaRegion) throw new Error('MKA region not found');

    // Create MKA regions
    console.log('Creating MKA regions...');
    const mkaRegions = [
        { name: 'Motu', geoRegionId: mkaRegion.id },
        { name: 'Koitabu', geoRegionId: mkaRegion.id }
    ];

    for (const region of mkaRegions) {
        await prisma.mkaRegion.upsert({
            where: {
                name_geoRegionId: {
                    name: region.name,
                    geoRegionId: mkaRegion.id
                }
            },
            update: region,
            create: region
        });
    }

    // Get all regions
    const regions = await prisma.mkaRegion.findMany({
        where: { geoRegionId: mkaRegion.id }
    });

    // Create MKA wards
    console.log('Creating MKA wards...');
    const mkaWards = [
        { name: 'Hanuabada', regionId: regions.find(r => r.name === 'Motu').id, sections: ['Hohodae', 'Laurina', 'Tanobada'] },
        { name: 'Tatana', regionId: regions.find(r => r.name === 'Motu').id, sections: ['East Tatana', 'West Tatana'] },
        { name: 'Vabukori', regionId: regions.find(r => r.name === 'Motu').id, sections: ['Upper Vabukori', 'Lower Vabukori'] },
        { name: 'Kila Kila', regionId: regions.find(r => r.name === 'Koitabu').id, sections: ['North Kila', 'South Kila'] },
        { name: 'Kirakira', regionId: regions.find(r => r.name === 'Koitabu').id, sections: ['Kirakira A', 'Kirakira B'] },
        { name: 'Baruni', regionId: regions.find(r => r.name === 'Koitabu').id, sections: ['Upper Baruni', 'Lower Baruni'] }
    ];

    for (const ward of mkaWards) {
        await prisma.mkaWard.upsert({
            where: {
                name_regionId: {
                    name: ward.name,
                    regionId: ward.regionId
                }
            },
            update: {
                name: ward.name,
                sections: ward.sections
            },
            create: {
                name: ward.name,
                regionId: ward.regionId,
                sections: ward.sections
            }
        });
    }

    console.log('MKA data seeded successfully');
}

// Main function to run the seeding process
async function main() {
    console.log('Starting database reset and geo data seeding process...');

    try {
        // First reset the database
        await resetDatabase();

        // Create the top-level geo regions
        await createGeoRegions();

        // Seed PNG data
        await seedPNGData();

        // Seed ABG data
        await seedABGData();

        // Seed MKA data
        await seedMKAData();

        console.log('All geo data seeded successfully');
    } catch (error) {
        console.error('Error seeding geo data:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the main function
main();