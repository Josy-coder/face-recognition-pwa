const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const prisma = new PrismaClient();

// Function to read and parse CSV files
function readCSVFile(fileName) {
    try {
        const filePath = path.join(__dirname, '../data', fileName);
        if (!fs.existsSync(filePath)) {
            console.warn(`CSV file not found: ${fileName}`);
            return [];
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');

        // Determine if the file has headers based on name
        const hasHeaders = ['abgRegions.csv', 'abgDistricts.csv', 'abgConstituencies.csv'].includes(fileName);

        const records = parse(fileContent, {
            columns: hasHeaders,
            skip_empty_lines: true,
            trim: true
        });

        if (!hasHeaders) {
            // Convert array records to objects
            return records.map(row => {
                // Note: 1-based indexing for consistency with provided CSV format
                return row.reduce((acc, value, index) => {
                    acc[index + 1] = value;
                    return acc;
                }, {});
            });
        }

        return records;
    } catch (error) {
        console.error(`Error reading CSV file ${fileName}:`, error);
        return [];
    }
}

// Reset the database
async function resetDatabase() {
    console.log('Resetting database...');

    try {
        // Delete locations first
        await prisma.location.deleteMany();
        console.log('- Locations deleted');

        // Delete PNG structure
        await prisma.ward.deleteMany();
        console.log('- Wards deleted');

        await prisma.lLG.deleteMany(); // Note the capitalization for LLG
        console.log('- LLGs deleted');

        await prisma.district.deleteMany();
        console.log('- Districts deleted');

        await prisma.province.deleteMany();
        console.log('- Provinces deleted');

        // Delete ABG structure
        await prisma.constituency.deleteMany();
        console.log('- Constituencies deleted');

        await prisma.abgDistrict.deleteMany();
        console.log('- ABG Districts deleted');

        await prisma.region.deleteMany();
        console.log('- Regions deleted');

        // Delete MKA structure
        await prisma.mkaWard.deleteMany();
        console.log('- MKA Wards deleted');

        await prisma.mkaRegion.deleteMany();
        console.log('- MKA Regions deleted');

        // Delete top level regions
        await prisma.geoRegion.deleteMany();
        console.log('- Geo Regions deleted');

        // Delete history
        await prisma.nodeMovementHistory.deleteMany();
        console.log('- Node Movement History deleted');

    } catch (error) {
        console.error('Error during database reset:', error);
        throw error;
    }
}

// Create top-level geo regions
async function createGeoRegions() {
    console.log('Creating geo regions...');
    const regions = [
        { name: 'PNG', type: 'National', level: 0, order: 0 },
        { name: 'ABG', type: 'Autonomous Region', level: 0, order: 1 },
        { name: 'MKA', type: 'Assembly', level: 0, order: 2 }
    ];

    for (const region of regions) {
        await prisma.geoRegion.upsert({
            where: { name: region.name },
            update: region,
            create: region
        });
        console.log(`- Created ${region.name} region`);
    }
}

// Seed PNG data
async function seedPNGData() {
    console.log('Seeding PNG data...');
    const pngRegion = await prisma.geoRegion.findUnique({ where: { name: 'PNG' } });
    if (!pngRegion) throw new Error('PNG region not found');

    // Maps to store created node IDs
    const provinceIdMap = new Map();
    const districtIdMap = new Map();
    const llgIdMap = new Map();
    const wardIdMap = new Map();

    // Process Provinces
    console.log('Processing provinces...');
    const provinces = readCSVFile('pngProvinces.csv');
    for (const province of provinces) {
        try {
            const dbProvince = await prisma.province.upsert({
                where: {
                    name_geoRegionId: {
                        name: province[2],
                        geoRegionId: pngRegion.id
                    }
                },
                update: {
                    code: province[1].toString(),
                    path: `PNG/${province[2]}`,
                    level: 1,
                    order: parseInt(province[1])
                },
                create: {
                    name: province[2],
                    code: province[1].toString(),
                    geoRegionId: pngRegion.id,
                    path: `PNG/${province[2]}`,
                    level: 1,
                    order: parseInt(province[1])
                }
            });
            provinceIdMap.set(province[1], dbProvince.id);
            console.log(`- Added province: ${province[2]}`);
        } catch (error) {
            console.error(`Error processing province ${province[2]}:`, error);
        }
    }

    // Process Districts
    console.log('Processing districts...');
    const districts = readCSVFile('pngDistricts.csv');
    for (const district of districts) {
        const provinceId = provinceIdMap.get(district[1]);
        if (!provinceId) {
            console.warn(`Skipping district ${district[3]} - Province ID ${district[1]} not found`);
            continue;
        }

        try {
            const province = await prisma.province.findUnique({
                where: { id: provinceId }
            });
            if (!province) continue;

            const dbDistrict = await prisma.district.upsert({
                where: {
                    name_provinceId: {
                        name: district[3],
                        provinceId: provinceId
                    }
                },
                update: {
                    code: district[2].toString(),
                    path: `${province.path}/${district[3]}`,
                    level: 2,
                    order: parseInt(district[2])
                },
                create: {
                    name: district[3],
                    code: district[2].toString(),
                    provinceId: provinceId,
                    path: `${province.path}/${district[3]}`,
                    level: 2,
                    order: parseInt(district[2])
                }
            });
            districtIdMap.set(district[2], dbDistrict.id);
            console.log(`- Added district: ${district[3]}`);
        } catch (error) {
            console.error(`Error processing district ${district[3]}:`, error);
        }
    }

    // Process LLGs
    console.log('Processing LLGs...');
    const llgs = readCSVFile('pngLLGs.csv');
    for (const llg of llgs) {
        const districtId = districtIdMap.get(llg[1]);
        if (!districtId) {
            console.warn(`Skipping LLG ${llg[3]} - District ID ${llg[1]} not found`);
            continue;
        }

        try {
            const district = await prisma.district.findUnique({
                where: { id: districtId }
            });
            if (!district) continue;

            const dbLLG = await prisma.lLG.upsert({
                where: {
                    name_districtId: {
                        name: llg[3],
                        districtId: districtId
                    }
                },
                update: {
                    code: llg[2].toString(),
                    path: `${district.path}/${llg[3]}`,
                    level: 3,
                    order: parseInt(llg[2])
                },
                create: {
                    name: llg[3],
                    code: llg[2].toString(),
                    districtId: districtId,
                    path: `${district.path}/${llg[3]}`,
                    level: 3,
                    order: parseInt(llg[2])
                }
            });
            llgIdMap.set(llg[2], dbLLG.id);
            console.log(`- Added LLG: ${llg[3]}`);
        } catch (error) {
            console.error(`Error processing LLG ${llg[3]}:`, error);
        }
    }

    // Process Wards
    console.log('Processing wards...');
    const wards = readCSVFile('pngWards.csv');
    for (const ward of wards) {
        const llgId = llgIdMap.get(ward[1]);
        if (!llgId) {
            console.warn(`Skipping Ward ${ward[3]} - LLG ID ${ward[1]} not found`);
            continue;
        }

        try {
            const llg = await prisma.lLG.findUnique({
                where: { id: llgId }
            });
            if (!llg) continue;

            const dbWard = await prisma.ward.upsert({
                where: {
                    name_llgId: {
                        name: ward[3],
                        llgId: llgId
                    }
                },
                update: {
                    code: ward[2].toString(),
                    path: `${llg.path}/${ward[3]}`,
                    level: 4,
                    order: parseInt(ward[2]),
                    villages: []
                },
                create: {
                    name: ward[3],
                    code: ward[2].toString(),
                    llgId: llgId,
                    path: `${llg.path}/${ward[3]}`,
                    level: 4,
                    order: parseInt(ward[2]),
                    villages: []
                }
            });
            wardIdMap.set(ward[2], dbWard.id);
            console.log(`- Added Ward: ${ward[3]}`);
        } catch (error) {
            console.error(`Error processing Ward ${ward[3]}:`, error);
        }
    }

    // Process Locations/Villages
    console.log('Processing locations...');
    const locations = readCSVFile('pngLocations.csv');
    const locationsByWard = new Map();

    // Group locations by ward
    for (const location of locations) {
        const wardCode = location[1];
        if (!locationsByWard.has(wardCode)) {
            locationsByWard.set(wardCode, []);
        }
        locationsByWard.get(wardCode).push(location[3]);
    }

    // Update wards with their locations
    for (const [wardCode, locationNames] of locationsByWard) {
        const wardId = wardIdMap.get(wardCode);
        if (!wardId) {
            console.warn(`Skipping locations for Ward Code ${wardCode} - Ward not found`);
            continue;
        }

        try {
            const ward = await prisma.ward.findUnique({
                where: { id: wardId }
            });
            if (!ward) continue;

            // Update ward with villages
            await prisma.ward.update({
                where: { id: wardId },
                data: { villages: locationNames }
            });

            // Create location records
            for (let i = 0; i < locationNames.length; i++) {
                const locationName = locationNames[i];
                await prisma.location.upsert({
                    where: {
                        path: `${ward.path}/${locationName}`
                    },
                    update: {
                        name: locationName,
                        wardId: wardId,
                        path: `${ward.path}/${locationName}`,
                        level: 5,
                        order: i
                    },
                    create: {
                        name: locationName,
                        wardId: wardId,
                        path: `${ward.path}/${locationName}`,
                        level: 5,
                        order: i
                    }
                });
            }
            console.log(`- Added ${locationNames.length} locations to Ward ${ward.name}`);
        } catch (error) {
            console.error(`Error processing locations for Ward Code ${wardCode}:`, error);
        }
    }
}

// Seed ABG data
async function seedABGData() {
    console.log('Seeding ABG data...');
    const abgRegion = await prisma.geoRegion.findUnique({ where: { name: 'ABG' } });
    if (!abgRegion) throw new Error('ABG region not found');

    const regionIdMap = new Map();
    const districtIdMap = new Map();

    // Process ABG Regions
    console.log('Processing ABG regions...');
    const regions = readCSVFile('abgRegions.csv');
    for (const region of regions) {
        try {
            const dbRegion = await prisma.region.upsert({
                where: {
                    name_geoRegionId: {
                        name: region.ABGRegionName,
                        geoRegionId: abgRegion.id
                    }
                },
                update: {
                    code: region.ABGRegionID.toString(),
                    path: `ABG/${region.ABGRegionName}`,
                    level: 1,
                    order: parseInt(region.ABGRegionID)
                },
                create: {
                    name: region.ABGRegionName,
                    code: region.ABGRegionID.toString(),
                    geoRegionId: abgRegion.id,
                    path: `ABG/${region.ABGRegionName}`,
                    level: 1,
                    order: parseInt(region.ABGRegionID)
                }
            });
            regionIdMap.set(region.ABGRegionID, dbRegion.id);
            console.log(`- Added ABG region: ${region.ABGRegionName}`);
        } catch (error) {
            console.error(`Error processing ABG region ${region.ABGRegionName}:`, error);
        }
    }

    // Process ABG Districts
    console.log('Processing ABG districts...');
    const districts = readCSVFile('abgDistricts.csv');
    for (const district of districts) {
        const regionId = regionIdMap.get(district.ABGRegionID);
        if (!regionId) {
            console.warn(`Skipping ABG district ${district.ABGDistrictName} - Region ID ${district.ABGRegionID} not found`);
            continue;
        }

        try {
            const region = await prisma.region.findUnique({
                where: { id: regionId }
            });
            if (!region) continue;

            const dbDistrict = await prisma.abgDistrict.upsert({
                where: {
                    name_regionId: {
                        name: district.ABGDistrictName,
                        regionId: regionId
                    }
                },
                update: {
                    code: district.ABGDistrictID.toString(),
                    path: `${region.path}/${district.ABGDistrictName}`,
                    level: 2,
                    order: parseInt(district.ABGDistrictID)
                },
                create: {
                    name: district.ABGDistrictName,
                    code: district.ABGDistrictID.toString(),
                    regionId: regionId,
                    path: `${region.path}/${district.ABGDistrictName}`,
                    level: 2,
                    order: parseInt(district.ABGDistrictID)
                }
            });
            districtIdMap.set(district.ABGDistrictID, dbDistrict.id);
            console.log(`- Added ABG district: ${district.ABGDistrictName}`);
        } catch (error) {
            console.error(`Error processing ABG district ${district.ABGDistrictName}:`, error);
        }
    }

    // Process ABG Constituencies
    console.log('Processing ABG constituencies...');
    const constituencies = readCSVFile('abgConstituencies.csv');
    for (const constituency of constituencies) {
        const districtId = districtIdMap.get(constituency.ABGDistrictID);
        if (!districtId) {
            console.warn(`Skipping constituency ${constituency.ConstituencyName} - District ID ${constituency.ABGDistrictID} not found`);
            continue;
        }

        try {
            const district = await prisma.abgDistrict.findUnique({
                where: { id: districtId }
            });
            if (!district) continue;

            await prisma.constituency.upsert({
                where: {
                    name_districtId: {
                        name: constituency.ConstituencyName,
                        districtId: districtId
                    }
                },
                update: {
                    code: constituency.ConstituencyID.toString(),
                    path: `${district.path}/${constituency.ConstituencyName}`,
                    level: 3,
                    order: parseInt(constituency.ConstituencyID),
                    villages: []
                },
                create: {
                    name: constituency.ConstituencyName,
                    code: constituency.ConstituencyID.toString(),
                    districtId: districtId,
                    path: `${district.path}/${constituency.ConstituencyName}`,
                    level: 3,
                    order: parseInt(constituency.ConstituencyID),
                    villages: []
                }
            });
            console.log(`- Added constituency: ${constituency.ConstituencyName}`);
        } catch (error) {
            console.error(`Error processing constituency ${constituency.ConstituencyName}:`, error);
        }
    }
}

// Seed MKA data
async function seedMKAData() {
    console.log('Seeding MKA data...');
    const mkaRegion = await prisma.geoRegion.findUnique({ where: { name: 'MKA' } });
    if (!mkaRegion) throw new Error('MKA region not found');

    const regionIdMap = new Map();

    // Process MKA Regions
    console.log('Processing MKA regions...');
    const regions = readCSVFile('mkaLLGs.csv');
    if (regions.length === 0) {
        // Create default regions if no data
        const defaultRegions = [
            { code: '1', name: 'Motu' },
            { code: '2', name: 'Koitabu' }
        ];

        for (const region of defaultRegions) {
            try {
                const dbRegion = await prisma.mkaRegion.upsert({
                    where: {
                        name_geoRegionId: {
                            name: region.name,
                            geoRegionId: mkaRegion.id
                        }
                    },
                    update: {
                        code: region.code,
                        path: `MKA/${region.name}`,
                        level: 1,
                        order: parseInt(region.code)
                    },
                    create: {
                        name: region.name,
                        code: region.code,
                        geoRegionId: mkaRegion.id,
                        path: `MKA/${region.name}`,
                        level: 1,
                        order: parseInt(region.code)
                    }
                });
                regionIdMap.set(region.code, dbRegion.id);
                console.log(`- Added default MKA region: ${region.name}`);
            } catch (error) {
                console.error(`Error processing default MKA region ${region.name}:`, error);
            }
        }
    } else {
        for (const region of regions) {
            try {
                const dbRegion = await prisma.mkaRegion.upsert({
                    where: {
                        name_geoRegionId: {
                            name: region[2],
                            geoRegionId: mkaRegion.id
                        }
                    },
                    update: {
                        code: region[1].toString(),
                        path: `MKA/${region[2]}`,
                        level: 1,
                        order: parseInt(region[1])
                    },
                    create: {
                        name: region[2],
                        code: region[1].toString(),
                        geoRegionId: mkaRegion.id,
                        path: `MKA/${region[2]}`,
                        level: 1,
                        order: parseInt(region[1])
                    }
                });
                regionIdMap.set(region[1], dbRegion.id);
                console.log(`- Added MKA region: ${region[2]}`);
            } catch (error) {
                console.error(`Error processing MKA region ${region[2]}:`, error);
            }
        }
    }

    // Process MKA Wards and Locations
    console.log('Processing MKA wards and locations...');
    const wards = readCSVFile('mkaWards.csv');
    const locations = readCSVFile('mkaLocations.csv');

    // Group locations by ward
    const locationsByWard = new Map();
    for (const location of locations) {
        const wardCode = location[1];
        if (!locationsByWard.has(wardCode)) {
            locationsByWard.set(wardCode, []);
        }
        locationsByWard.get(wardCode).push(location[3]);
    }

    // Process wards and their locations
    for (const ward of wards) {
        const regionId = regionIdMap.get(ward[1]);
        if (!regionId) {
            console.warn(`Skipping MKA ward ${ward[3]} - Region ID ${ward[1]} not found`);
            continue;
        }

        try {
            const region = await prisma.mkaRegion.findUnique({
                where: { id: regionId }
            });
            if (!region) continue;

            const dbWard = await prisma.mkaWard.upsert({
                where: {
                    name_regionId: {
                        name: ward[3],
                        regionId: regionId
                    }
                },
                update: {
                    code: ward[2].toString(),
                    path: `${region.path}/${ward[3]}`,
                    level: 2,
                    order: parseInt(ward[2]),
                    sections: locationsByWard.get(ward[2]) || []
                },
                create: {
                    name: ward[3],
                    code: ward[2].toString(),
                    regionId: regionId,
                    path: `${region.path}/${ward[3]}`,
                    level: 2,
                    order: parseInt(ward[2]),
                    sections: locationsByWard.get(ward[2]) || []
                }
            });

            // Create location records
            const wardLocations = locationsByWard.get(ward[2]) || [];
            for (let i = 0; i < wardLocations.length; i++) {
                const locationName = wardLocations[i];
                await prisma.location.upsert({
                    where: {
                        path: `${dbWard.path}/${locationName}`
                    },
                    update: {
                        name: locationName,
                        mkaWardId: dbWard.id,
                        path: `${dbWard.path}/${locationName}`,
                        level: 3,
                        order: i
                    },
                    create: {
                        name: locationName,
                        mkaWardId: dbWard.id,
                        path: `${dbWard.path}/${locationName}`,
                        level: 3,
                        order: i
                    }
                });
            }
            console.log(`- Added MKA ward: ${ward[3]} with ${wardLocations.length} locations`);
        } catch (error) {
            console.error(`Error processing MKA ward ${ward[3]}:`, error);
        }
    }
}

// Main function
async function main() {
    try {
        await resetDatabase();
        await createGeoRegions();
        await seedPNGData();
        await seedABGData();
        await seedMKAData();
        console.log('Geo data seeding completed successfully');
    } catch (error) {
        console.error('Error seeding geo data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seeding
main()
    .catch((error) => {
        console.error('Failed to seed database:', error);
        process.exit(1);
    });