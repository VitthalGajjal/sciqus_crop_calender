import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import color from '../assets/Color';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLOR_PALETTE = [
    '#4CAF50', // Green
    '#1A476F', // Dark blue
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#2196F3', // Blue
    '#E91E63', // Pink
    '#795548', // Brown
    '#607D8B', // Blue Grey
    '#009688', // Teal
    '#FF5722', // Deep Orange
];

const ScheduleCard = ({ activities }) => {
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'list'
    const [expandedListItem, setExpandedListItem] = useState(null);

    if (!activities || activities.length === 0) {
        return (
            <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No activities scheduled yet</Text>
            </View>
        );
    }

    const activityColorMap = {};
    activities.forEach((activity, index) => {
        const colorIndex = index % COLOR_PALETTE.length;
        activityColorMap[activity.activityName] = COLOR_PALETTE[colorIndex];
    });

    const handleLegendPress = (activity) => {
        setSelectedActivity(selectedActivity === activity ? null : activity);
    };

    const handleListItemPress = (index) => {
        setExpandedListItem(expandedListItem === index ? null : index);
    };

    // Parse the activity object directly
    const formatActivityDetails = (activity) => {
        // Convert description to bullet points (sentences)
        const description = activity.description ? 
            activity.description.split('. ').filter(item => item.trim().length > 0).map(item => 
                item.endsWith('.') ? item : item + '.') : 
            [];
        return {
            description
        };
    };

    const renderListView = () => {
        return (
            <ScrollView style={styles.listViewContainer}>
                {activities.map((activity, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => handleListItemPress(index)}
                        style={[styles.listItem, { borderLeftColor: activityColorMap[activity.activityName] }]}
                    >
                        <View style={styles.listItemHeader}>
                            <View style={[styles.legendColor, { backgroundColor: activityColorMap[activity.activityName] }]} />
                            <Text style={styles.listItemTitle}>{activity.activityName}</Text>
                            <Text style={styles.listItemPeriodText}>
                                {activity.month || `${MONTHS[new Date(activity.startDate).getMonth()]} - ${MONTHS[new Date(activity.endDate).getMonth()]}`}
                            </Text>
                            <Image 
                                style={[
                                    styles.dropdownimage, 
                                    expandedListItem === index && styles.dropdownimageExpanded
                                ]} 
                                source={require('../assets/icon/arrow_drop_down_22dp_000000_FILL0_wght400_GRAD0_opsz24.png')}
                            />
                        </View>
                        
                        {expandedListItem === index && (
                            <View style={styles.listItemDescription}>
                                {(() => {
                                    const details = formatActivityDetails(activity);
                                    return (
                                        <>
                                            {details.description.length > 0 && (
                                                <>
                                                    <Text style={styles.descriptionSubtitle}>Description:</Text>
                                                    {details.description.map((point, idx) => (
                                                        <View key={`desc-${idx}`} style={styles.bulletPoint}>
                                                            <Text style={styles.bulletDot}>•</Text>
                                                            <Text style={styles.bulletText}>{point}</Text>
                                                        </View>
                                                    ))}
                                                </>
                                            )}
                                        </>
                                    );
                                })()}
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    const renderTimelineView = () => {
        return (
            <>
                <View style={styles.chartContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollableArea}>
                        <View>
                            <View style={styles.monthsHeaderRow}>
                                {MONTHS.map((month, index) => (
                                    <View key={index} style={styles.monthColumn}>
                                        <Text style={styles.monthLabel}>{month}</Text>
                                    </View>
                                ))}
                            </View>
                            {activities.map((activity, activityIndex) => {
                                const startMonth = new Date(activity.startDate).getMonth();
                                const endMonth = new Date(activity.endDate).getMonth();
                                const activityColor = activityColorMap[activity.activityName];

                                return (
                                    <View key={activityIndex} style={styles.timelineRow}>
                                        {MONTHS.map((month, index) => {
                                            const isActive = index >= startMonth && index <= endMonth;
                                            return (
                                                <View key={index} style={styles.monthColumn}>
                                                    <View style={[styles.monthBlock, isActive ? { backgroundColor: activityColor } : styles.inactiveMonth]} />
                                                </View>
                                            );
                                        })}
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>

                <View style={styles.activitiesListContainer}>
                    <Text style={styles.activitiesListTitle}>Activities:</Text>
                    {activities.map((activity, index) => (
                        <TouchableOpacity 
                            key={index} 
                            style={[styles.activityItem, { borderLeftColor: activityColorMap[activity.activityName] }]}
                            onPress={() => handleLegendPress(activity)}
                        >
                            <View style={styles.activityHeader}>
                                <View style={[styles.legendColor, { backgroundColor: activityColorMap[activity.activityName] }]} />
                                <Text style={styles.activityName}>{activity.activityName}</Text>
                                <Text style={styles.activityPeriod}>
                                    {activity.month || `${MONTHS[new Date(activity.startDate).getMonth()]} - ${MONTHS[new Date(activity.endDate).getMonth()]}`}
                                </Text>
                                <Image style={styles.dropdownimage} source={require('../assets/icon/arrow_drop_down_22dp_000000_FILL0_wght400_GRAD0_opsz24.png')}/>
                            </View>
                            
                            {selectedActivity === activity && (
                                <View style={styles.descriptionContainer}>
                                    {(() => {
                                        const details = formatActivityDetails(activity);
                                        return (
                                            <>
                                                {details.description.length > 0 && (
                                                    <>
                                                        <Text style={styles.descriptionSubtitle}>Description:</Text>
                                                        {details.description.map((point, idx) => (
                                                            <View key={`desc-${idx}`} style={styles.bulletPoint}>
                                                                <Text style={styles.bulletDot}>•</Text>
                                                                <Text style={styles.bulletText}>{point}</Text>
                                                            </View>
                                                        ))}
                                                    </>
                                                )}
                                            </>
                                        );
                                    })()}
                                </View>
                            )}
                            
                        </TouchableOpacity>
                    ))}
                </View>
            </>
        );
    };

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Planting Schedule</Text>
                <View style={styles.viewToggle}>
                    <TouchableOpacity 
                        style={[styles.toggleButton, viewMode === 'timeline' && styles.activeToggle]} 
                        onPress={() => setViewMode('timeline')}
                    >
                        <Text style={[styles.toggleText, viewMode === 'timeline' && styles.activeToggleText]}>Timeline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]} 
                        onPress={() => setViewMode('list')}
                    >
                        <Text style={[styles.toggleText, viewMode === 'list' && styles.activeToggleText]}>List</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {viewMode === 'timeline' ? renderTimelineView() : renderListView()}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: color.lightGray,
        padding: 16,
        marginVertical: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    viewToggle: {
        flexDirection: 'row',
        backgroundColor: color.lightAccent,
        borderRadius: 20,
        overflow: 'hidden',
    },
    toggleButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeToggle: {
        backgroundColor: color.secondary,
        borderRadius: 20,
    },
    toggleText: {
        fontSize: 14,
        color: color.black,
    },
    activeToggleText: {
        color: color.white,
        fontWeight: '500',
    },
    chartContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    scrollableArea: {
        flex: 1,
    },
    monthsHeaderRow: {
        flexDirection: 'row',
        height: 32,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    monthColumn: {
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthLabel: {
        fontSize: 12,
        color: '#666',
    },
    timelineRow: {
        flexDirection: 'row',
        height: 30,
        alignItems: 'center',
    },
    monthBlock: {
        width: 60,
        height: 30,
        borderWidth: 0.5,
        borderColor: '#ddd',
    },
    inactiveMonth: {
        backgroundColor: '#f5f5f5',
    },
    activitiesListContainer: {
        marginTop: 10,
    },
    activitiesListTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    activityItem: {
        backgroundColor: '#fff',
        marginBottom: 10,
        borderRadius: 5,
        overflow: 'hidden',
        borderLeftWidth: 5,
    },
    activityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    legendColor: {
        width: 16,
        height: 16,
        borderRadius: 4,
        marginRight: 8,
    },
    activityName: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    activityPeriod: {
        fontSize: 14,
        color: '#666',
    },
    dropdownimage: {
        width: 25, 
        height: 20, 
        marginLeft: 10,
    },
    dropdownimageExpanded: {
        transform: [{ rotate: '180deg' }],
    },
    descriptionContainer: {
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    descriptionSubtitle: {
        fontSize: 15,
        fontWeight: 'bold',
        marginTop: 8,
        marginBottom: 4,
        color: '#555',
    },
    bulletPoint: {
        flexDirection: 'row',
        marginBottom: 3,
        paddingLeft: 4,
    },
    bulletDot: {
        fontSize: 14,
        color: '#333',
        marginRight: 6,
        width: 10,
    },
    bulletText: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    emptyCard: {
        backgroundColor: '#fff',
        padding: 32,
        marginVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
    // List view specific styles
    listViewContainer: {
        flex: 1,
    },
    listItem: {
        backgroundColor: '#fff',
        marginBottom: 15,
        borderRadius: 5,
        overflow: 'hidden',
        borderLeftWidth: 5,
    },
    listItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    listItemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    listItemPeriodText: {
        fontSize: 14,
        color: '#666',
        marginRight: 5,
    },
    listItemDescription: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 14,
        backgroundColor: '#f9f9f9',
    },
});

export default ScheduleCard;